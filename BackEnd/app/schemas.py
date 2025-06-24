from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, func
from typing import List
# ===== USER =====

class UserLogin(BaseModel):
    email : str
    password : str

class UserInsert(BaseModel):
    id : int
    email : str

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    email : str
    password : str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True


# ===== NATURAL PERSON =====
class NaturalPersonBase(BaseModel):
    username: str
    first_name: str
    last_name: str
    gender: Optional[str] = None
    email: EmailStr
    password: str
    phone_number: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

class NaturalPersonCreate(NaturalPersonBase):
    user_id: int

class NaturalPersonOut(NaturalPersonBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        orm_mode = True


# ===== SOCIETY =====
class SocietyBase(BaseModel):
    username: str
    ragione_sociale: str
    sede_legale: Optional[str] = None
    partita_iva: str
    email: EmailStr
    password: str
    province: Optional[str] = None
    city: Optional[str] = None

class SocietyCreate(SocietyBase):
    user_id: int

class SocietyOut(SocietyBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        orm_mode = True


# ===== PLOTS =====
class PlotBase(BaseModel):
    name: str

class PlotCreate(PlotBase):
    user_id: int
    geom: dict  # GeoJSON

class PlotOut(PlotBase):
    id: int
    user_id: int
    geom: dict
    centroid: Optional[dict] = None
    created_at: datetime
    class Config:
        orm_mode = True

class RenamePlotRequest(BaseModel):
    user_id: int
    old_name: str
    new_name: str

class DeletePlotRequest(BaseModel):
    user_id: int
    plot_name: str

# ===== SPECIES =====
class SpeciesBase(BaseModel):
    name: str
    co2_absorption_rate: float
    o2_production_rate: float

class SpeciesCreate(SpeciesBase):
    pass

class SpeciesSave(BaseModel):
    name: str
    quantity: int 

class SpeciesOut(SpeciesBase):
    id: int
    class Config:
        orm_mode = True


# ===== PLOT_SPECIES =====
class PlotSpeciesBase(BaseModel):
    plot_id: int
    species_id: int
    quantity: Optional[int] = None

class PlotSpeciesCreate(PlotSpeciesBase):
    pass

class PlotSpeciesOut(PlotSpeciesBase):
    id: int
    actual_co2_absorption: Optional[float] = None
    actual_o2_production: Optional[float] = None
    class Config:
        orm_mode = True


# ===== WEATHER DATA =====
class WeatherDataBase(BaseModel):
    plot_id: int
    date_time: datetime
    temperature: Optional[float] = None
    precipitation: Optional[float] = None
    solar_radiation: Optional[float] = None
    humidity: Optional[int] = None

class WeatherDataCreate(WeatherDataBase):
    pass

class WeatherDataOut(WeatherDataBase):
    id: int
    total_co2_absorption: Optional[float] = None
    total_o2_production: Optional[float] = None
    class Config:
        orm_mode = True


class SpeciesSave(BaseModel):
    name: str
    quantity: int

class Centroid(BaseModel):
    lat: float
    long: float

class Coordinate(BaseModel):
    lat: float
    long: float

class Vertice(BaseModel):
    lat: float
    long: float


class CalcoloRequest(BaseModel):
    terreno: List[PlotBase]
    vegetazione: List[PlotSpeciesBase]
    class Config:
        orm_mode = True


class CalcoloResponse(BaseModel):
    co2_giornaliera: float
    o2_giornaliera: float
    dettaglio_per_specie: List[dict]  # Esempio: {"nome": "quercia", "co2": 12.4, "o2": 8.1} (vogliamo farlo così?)

class SaveCoordinatesRequest(BaseModel):
    idutente: int
    terrainName: str
    species: list[SpeciesSave]
    centroid: Centroid
    vertices: List[Coordinate]
    created_at: datetime
    model_config = {
        "from_attributes": True
    }

class SaveCoordinatesResponse(BaseModel):
    message : str
    terrain_id: Optional[int] = None

class ClassificaRequest(BaseModel):
    criterio: str

class ClassificaResponse(BaseModel):
    Classifica: List[dict]

class EsportaRequest(BaseModel):
    # campi di esempio, da adattare alle tue necessità
    formato: str
    dati: Optional[List[dict]] = None

class EsportaResponse(BaseModel):
    esito: str
    url_file: Optional[str] = None

#pip install fastapi uvicorn sqlalchemy geoalchemy2 shapely psycopg2-binary

