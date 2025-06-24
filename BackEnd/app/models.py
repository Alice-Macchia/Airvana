from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column
from geoalchemy2 import Geometry
from pydantic import BaseModel
from typing import List
from pydantic import BaseModel
from typing import List, Optional


class PlotBase(BaseModel):
    id: Optional[int]
    name: Optional[str]
    # Aggiungi altri campi se servono, ma evita Geometry complessi (o usa stringhe WKT/GeoJSON)

class PlotSpeciesBase(BaseModel):
    species_id: int
    surface_area: int
    actual_co2_absorption: Optional[float] = None
    actual_o2_production: Optional[float] = None

# from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP
# from sqlalchemy.orm import relationship, declarative_base
# from geoalchemy2 import Geometry
# from sqlalchemy import func


Base = declarative_base()

# --- USERS (generico) ---
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    #id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    natural_person = relationship("NaturalPerson", back_populates="user", uselist=False)
    society = relationship("Society", back_populates="user", uselist=False)
    #plots = relationship("Plot", backref="owner")
    plots_associated: Mapped[List["Plot"]] = relationship(back_populates="user")

# --- NATURAL PERSON ---
class NaturalPerson(Base):
    __tablename__ = "natural_person"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    username = Column(String(50), unique=True, nullable=False) 
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(10))
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    phone_number = Column(String(20))
    province = Column(String(100))
    city = Column(String(100))
    address = Column(String(200))
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="natural_person")


# --- SOCIETY ---
class Society(Base):
    __tablename__ = "society"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    username = Column(String(50), unique=True, nullable=False) 
    ragione_sociale = Column(String(150), nullable=False)
    sede_legale = Column(String(200))
    partita_iva = Column(String(20), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    province = Column(String(100))
    city = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="society")


# --- PLOTS ---
class Plot(Base):
    __tablename__ = "plots"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    #id = Column(Integer, primary_key=True, index=True)
    #user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100))
    geom = Column(Geometry(geometry_type="POLYGON", srid=4326))
    centroid = Column(Geometry(geometry_type="POINT", srid=4326))
    created_at = Column(TIMESTAMP, server_default=func.now())

    weather = relationship("WeatherData", backref="plot")
    user: Mapped["User"] = relationship(back_populates="plots_associated") # Assumendo un modello User
    species_associations: Mapped[List["PlotSpecies"]] = relationship(back_populates="plot")
   


# --- SPECIES ---
class Species(Base):
    __tablename__ = "species"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    co2_absorption_rate = Column(Float)
    o2_production_rate = Column(Float)

    plots = relationship("PlotSpecies", backref="species")


# --- PLOT-SPECIES ---
class PlotSpecies(Base):
    __tablename__ = "plot_species"
    id: Mapped[int] = mapped_column(primary_key=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"))
    species_id: Mapped[int] = mapped_column(ForeignKey("species.id"))
    surface_area: Mapped[int] # o Mapped[int] a seconda del tipo di DB
    #id = Column(Integer, primary_key=True)
    # plot_id = Column(Integer, ForeignKey("plots.id"))
    # species_id = Column(Integer, ForeignKey("species.id"))
    # surface_area = Column(Float)
    plot: Mapped["Plot"] = relationship(back_populates="species_associations")



# --- WEATHER DATA ---
class WeatherData(Base):
    __tablename__ = "weather_data"
    id = Column(Integer, primary_key=True)
    plot_id = Column(Integer, ForeignKey("plots.id"))
    date_time = Column(TIMESTAMP, nullable=False)
    temperature = Column(Float)
    precipitation = Column(Float)
    solar_radiation = Column(Float)
    humidity = Column(Integer)
    total_co2_absorption = Column(Float)
    total_o2_production = Column(Float)


    # se vuoi puoi aggiungere questi campi, ma nel DB li hai commentati
    # total_co2_absorption = Column(Float)
    # total_o2_production = Column(Float)
