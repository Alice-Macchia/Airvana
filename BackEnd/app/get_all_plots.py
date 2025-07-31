from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from BackEnd.app.models import Plot
from geoalchemy2.shape import to_shape

async def get_all_plots_coords(db: AsyncSession):
    result = await db.execute(select(Plot.id, Plot.geometry))
    plots = []
    for plot_id, geometry in result.all():
        if geometry:
            shapely_geom = to_shape(geometry)
            centroid = shapely_geom.centroid
            plots.append({
                "plot_id": plot_id,
                "lat": centroid.y,
                "lon": centroid.x
            })
    return plots
