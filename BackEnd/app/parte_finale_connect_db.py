import psycopg2 
from dotenv import load_dotenv
import os
import sys  

# Connessione al database
def recupero_coords_geocentroide(): 
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL_geo_station")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Dizionario da cui prendiamo il valore id_variabile
    params = {'id': 1}  
    # da inserire la funzione di collegamento con il "frontend" (è+ sbalito lo so , ma per capirci)


    query = """
    SELECT id, ST_X(centroid) AS longitude, ST_Y(centroid) AS latitude
    FROM plots WHERE id= %s;
    """
    cur.execute(query, (params['id'],))
    row = cur.fetchone()  # Prendiamo UNA sola riga

    diz_centroide = {}

    if row:
        plot_id = row[0]
        longitude = row[1]
        latitude = row[2]

        diz_centroide = {
            'plot_id': plot_id,
            'latitudine': latitude,
            'longitudine': longitude
        }
        #print(f"\nPlot ID: {plot_id}, Latitudine: {latitude}, Longitude: {longitude}")

    else:
        print(f"\nNessun plot trovato con id {params['id']}")
        cur.close()
        conn.close()
        sys.exit()

    # Chiudere la connessione
    cur.close()
    conn.close()

    return diz_centroide