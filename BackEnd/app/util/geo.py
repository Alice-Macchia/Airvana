from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import shape, mapping

def geojson_to_wkt(geojson_dict):
    """Converte un oggetto GeoJSON in WKT per salvarlo nel DB."""
    shapely_geom = shape(geojson_dict)
    return from_shape(shapely_geom, srid=4326)

def calculate_centroid(geojson_dict):
    geom = shape(geojson_dict)
    return geom.centroid

def wkb_to_geojson(wkb_element):
    """Converte WKB (dal DB) in un dict GeoJSON serializzabile."""
    shapely_geom = to_shape(wkb_element)
    return mapping(shapely_geom)
