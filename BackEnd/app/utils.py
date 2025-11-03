from BackEnd.app.models import Plot, Species, PlotSpecies
from BackEnd.app.schemas import SaveCoordinatesRequest, SaveCoordinatesResponse
from BackEnd.app.database import SessionLocal
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon, Point
from sqlalchemy import select
from BackEnd.app.co2_o2_calculator import get_coefficients_from_db, calculate_co2_o2_hourly
from sqlalchemy import delete
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
from sqlalchemy import select
from BackEnd.app.models import PlotSpecies, Species

async def get_species_distribution_by_plot(plot_id: int, db: AsyncSession) -> List[Dict[str, any]]:
    """
    Recupera la distribuzione delle specie per un dato terreno.

    Interroga il database per ottenere l'elenco delle specie presenti in un terreno specifico,
    restituendo il nome di ciascuna specie e l'area di superficie che occupa.

    Args:
        plot_id (int): L'ID del terreno di cui si vuole conoscere la distribuzione delle specie.
        db (AsyncSession): La sessione asincrona del database.

    Returns:
        List[Dict[str, any]]: Una lista di dizionari, dove ogni dizionario rappresenta una specie
        e contiene le chiavi "name" (nome della specie) e "surface_area" (area occupata).

    Raises:
        HTTPException: Se si verifica un errore durante l'interrogazione del database.
    """
    try:
        stmt = select(Species.name, PlotSpecies.surface_area).select_from(
            PlotSpecies.__table__.join(Species.__table__)
        ).where(PlotSpecies.plot_id == plot_id)
        result = await db.execute(stmt)
        rows = result.fetchall()
        return [{"name": row.name, "surface_area": row.surface_area} for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Errore nel recupero delle specie")

async def inserisci_terreno(payload: SaveCoordinatesRequest) -> SaveCoordinatesResponse:
    """
    Salva un nuovo terreno nel database, incluse le sue coordinate, il baricentro
    e le specie associate con le relative aree.

    La funzione crea un poligono geometrico per il terreno e un punto per il baricentro,
    li inserisce nella tabella `Plot` e associa le specie specificate nella tabella `PlotSpecies`.

    Args:
        payload (SaveCoordinatesRequest): Un oggetto contenente i dati del terreno, tra cui
            l'ID utente, il nome del terreno, i vertici del poligono, il baricentro e l'elenco delle specie.

    Returns:
        SaveCoordinatesResponse: Un oggetto di risposta che conferma il salvataggio e restituisce
        l'ID del terreno appena creato.

    Raises:
        HTTPException: Se una delle specie specificate non viene trovata nel database o se
        si verifica un altro errore durante il salvataggio.
    """
    try:
        async with SessionLocal() as db:
            async with db.begin():
                # --- Geometrie (POLYGON e POINT) ---
                polygon = Polygon([(v.long, v.lat) for v in payload.vertices])
                point = Point(payload.centroid.long, payload.centroid.lat)

                # --- Crea Plot ---
                plot = Plot(
                    name=payload.terrainName,
                    user_id=payload.idutente,  
                    geom=from_shape(polygon, srid=4326),
                    centroid=from_shape(point, srid=4326)
                )
                db.add(plot)
                await db.flush()  # ottieni plot.id
                await db.refresh(plot)

                for specie_input in payload.species:
                    # Recupera o fallisce se specie non esiste
                    result = await db.execute(select(Species).where(Species.name == specie_input.name))
                    specie = result.scalar_one_or_none()
                    if not specie:
                        raise ValueError(f"Specie '{specie_input.name}' non trovata nel DB")


                    # Crea record PlotSpecies
                    ps = PlotSpecies(
                        plot_id=plot.id,
                        species_id=specie.id,
                        surface_area=specie_input.quantity,
                    )
                    db.add(ps)

                return SaveCoordinatesResponse(
                    message="Terreno salvato correttamente",
                    terrain_id=plot.id
                )
    except Exception as e: 
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {e}")

async def aggiorna_nome_plot(user_id: int, old_name: str, new_name: str) -> dict:
    """
    Aggiorna il nome di un terreno specifico appartenente a un utente.

    La funzione cerca un terreno (`Plot`) utilizzando il vecchio nome e l'ID dell'utente
    per garantire che solo il proprietario possa modificarlo. Se trovato, il nome
    del terreno viene aggiornato con quello nuovo.

    Args:
        user_id (int): L'ID dell'utente che possiede il terreno.
        old_name (str): Il nome attuale del terreno da modificare.
        new_name (str): Il nuovo nome da assegnare al terreno.

    Returns:
        dict: Un dizionario di conferma con un messaggio e l'ID del terreno modificato.

    Raises:
        ValueError: Se non viene trovato alcun terreno corrispondente al vecchio nome
        e all'ID utente forniti.
    """
    async with SessionLocal() as db:
        # Cerco il plot col nome, e assicuro che appartenga all'utente
        result = await db.execute(
            select(Plot)
            .where(Plot.name == old_name, Plot.user_id == user_id)
        )
        plot = result.scalar_one_or_none()

        if not plot:
            raise ValueError(f"Plot '{old_name}' non trovato per l'utente ID {user_id}")

        # Aggiorna il nome
        plot.name = new_name
        await db.commit()

        return {"message": "Nome del terreno aggiornato", "terrain_id": plot.id}

async def elimina_plot(user_id: int, plot_name: str) -> dict:
    """
    Elimina un terreno e tutte le sue dipendenze dal database.

    La funzione individua il terreno tramite il nome e l'ID dell'utente proprietario.
    Prima di eliminare il terreno, rimuove tutti i record associati nella tabella
    `PlotSpecies` per mantenere l'integrità referenziale.

    Args:
        user_id (int): L'ID dell'utente che possiede il terreno.
        plot_name (str): Il nome del terreno da eliminare.

    Returns:
        dict: Un dizionario di conferma con un messaggio di successo.

    Raises:
        ValueError: Se non viene trovato alcun terreno corrispondente al nome
        e all'ID utente forniti.
    """
    async with SessionLocal() as db:
        result = await db.execute(
            select(Plot)
            .where(Plot.name == plot_name, Plot.user_id == user_id)
        )
        plot = result.scalar_one_or_none()

        if not plot:
            raise ValueError(f"Plot '{plot_name}' non trovato per l'utente ID {user_id}")

        # Elimino prima i record figli se serve (PlotSpecies, WeatherData, ecc.)
        await db.execute(
            delete(PlotSpecies).where(PlotSpecies.plot_id == plot.id)
        )

        # Poi il plot
        await db.delete(plot)
        await db.commit()

        return {"message": f"Terreno '{plot_name}' eliminato correttamente"}
    

def mostra_classifica():
    """
    (Placeholder) Mostra una classifica basata su criteri da definire.

    Questa funzione è un segnaposto per una futura implementazione che genererà
    e restituirà una classifica, ad esempio degli utenti con il maggior assorbimento
    di CO2 o dei terreni più produttivi.
    """
    pass

class Esporta:
    pass
