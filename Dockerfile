FROM python:3.10-slim

# Variabili d'ambiente consigliate
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Crea cartella di lavoro
WORKDIR /Airvana

# Copia codice backend
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

# Espone la porta usata da uvicorn
EXPOSE 80

# Comando per lanciare l'app
CMD ["uvicorn", "BackEnd.app.main:app", "--host", "0.0.0.0", "--port", "80"]




# ssh root@165.22.75.145

# #una volta dentro il server
# git clone https://github.com/Alice-Macchia/Airvana.git
# cd Airvana

# git pull

# docker compose up --build -d
# docker compose up -d airvana_app --build  -> comando di Fabio

#docker build -t airvana_app:v1.1 .


#docker compose up -d airvana_app --build --force-recreate
#docker compose up -d

#docker ps 
#docker images

