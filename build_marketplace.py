#!/usr/bin/env python3
"""
Script per buildare il marketplace React e spostarlo nella cartella marketplace_dist
"""

import os
import subprocess
import shutil
from pathlib import Path

def build_marketplace():
    """Build del marketplace React e spostamento nella cartella marketplace_dist"""
    
    # Percorso del progetto React
    react_project_path = "airvana-marketplace"
    build_output_path = "marketplace_dist"
    
    print("🏗️  Building marketplace React...")
    
    # Verifica che la cartella del progetto React esista
    if not os.path.exists(react_project_path):
        print(f"❌ Cartella {react_project_path} non trovata!")
        return False
    
    # Cambia directory nel progetto React
    os.chdir(react_project_path)
    
    try:
        # Installa le dipendenze se node_modules non esiste
        if not os.path.exists("node_modules"):
            print("📦 Installing dependencies...")
            subprocess.run(["npm", "install"], check=True)
        
        # Build del progetto
        print("🔨 Building project...")
        subprocess.run(["npm", "run", "build"], check=True)
        
        # Torna alla directory root
        os.chdir("..")
        
        # Rimuovi la cartella marketplace_dist se esiste
        if os.path.exists(build_output_path):
            print(f"🗑️  Removing existing {build_output_path}...")
            shutil.rmtree(build_output_path)
        
        # Sposta la cartella dist nella root del progetto
        dist_path = os.path.join(react_project_path, "dist")
        if os.path.exists(dist_path):
            print(f"📁 Moving build to {build_output_path}...")
            shutil.move(dist_path, build_output_path)
            print("✅ Marketplace build completato!")
            return True
        else:
            print("❌ Cartella dist non trovata dopo il build!")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore durante il build: {e}")
        return False
    except Exception as e:
        print(f"❌ Errore imprevisto: {e}")
        return False

def check_marketplace_dist():
    """Verifica che la cartella marketplace_dist esista e contenga i file necessari"""
    
    marketplace_dist_path = "marketplace_dist"
    
    if not os.path.exists(marketplace_dist_path):
        print(f"❌ Cartella {marketplace_dist_path} non trovata!")
        return False
    
    # Verifica che index.html esista
    index_path = os.path.join(marketplace_dist_path, "index.html")
    if not os.path.exists(index_path):
        print(f"❌ File {index_path} non trovato!")
        return False
    
    print(f"✅ {marketplace_dist_path} verificata e pronta!")
    return True

if __name__ == "__main__":
    print("🚀 Airvana Marketplace Builder")
    print("=" * 40)
    
    # Verifica se marketplace_dist esiste già
    if check_marketplace_dist():
        print("📁 marketplace_dist già presente!")
        response = input("Vuoi ricostruire? (y/N): ")
        if response.lower() != 'y':
            print("✅ Build saltata.")
            exit(0)
    
    # Build del marketplace
    if build_marketplace():
        print("\n🎉 Marketplace buildato con successo!")
        print("📍 Disponibile su: http://localhost:8000/marketplace")
    else:
        print("\n❌ Errore durante il build del marketplace!")
        exit(1) 