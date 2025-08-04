#!/usr/bin/env python3
"""
Script completo per il deployment del marketplace React su FastAPI
"""

import os
import subprocess
import shutil
import sys
from pathlib import Path

def check_prerequisites():
    """Verifica i prerequisiti"""
    print("🔍 Checking prerequisites...")
    
    # Verifica Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js: {result.stdout.strip()}")
        else:
            print("❌ Node.js not found")
            return False
    except FileNotFoundError:
        print("❌ Node.js not found")
        return False
    
    # Verifica npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ npm: {result.stdout.strip()}")
        else:
            print("❌ npm not found")
            return False
    except FileNotFoundError:
        print("❌ npm not found")
        return False
    
    # Verifica cartella del progetto React
    if not os.path.exists("airvana-marketplace"):
        print("❌ airvana-marketplace directory not found")
        return False
    else:
        print("✅ airvana-marketplace directory found")
    
    return True

def build_marketplace():
    """Build del marketplace React"""
    print("\n🏗️  Building marketplace...")
    
    # Cambia directory nel progetto React
    os.chdir("airvana-marketplace")
    
    try:
        # Installa dipendenze
        print("📦 Installing dependencies...")
        subprocess.run(["npm", "install"], check=True)
        
        # Build del progetto
        print("🔨 Building project...")
        subprocess.run(["npm", "run", "build"], check=True)
        
        # Torna alla directory root
        os.chdir("..")
        
        # Rimuovi la cartella marketplace_dist se esiste
        if os.path.exists("marketplace_dist"):
            print("🗑️  Removing existing marketplace_dist...")
            shutil.rmtree("marketplace_dist")
        
        # Sposta la cartella dist
        dist_path = os.path.join("airvana-marketplace", "dist")
        if os.path.exists(dist_path):
            print("📁 Moving build to marketplace_dist...")
            shutil.move(dist_path, "marketplace_dist")
            print("✅ Build completed successfully!")
            return True
        else:
            print("❌ dist directory not found after build!")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def verify_deployment():
    """Verifica che il deployment sia corretto"""
    print("\n🔍 Verifying deployment...")
    
    marketplace_dist = "marketplace_dist"
    
    if not os.path.exists(marketplace_dist):
        print("❌ marketplace_dist directory not found")
        return False
    
    # Verifica file essenziali
    required_files = ["index.html"]
    for file in required_files:
        file_path = os.path.join(marketplace_dist, file)
        if not os.path.exists(file_path):
            print(f"❌ Required file {file} not found")
            return False
    
    # Verifica cartella assets
    assets_path = os.path.join(marketplace_dist, "assets")
    if not os.path.exists(assets_path):
        print("❌ assets directory not found")
        return False
    
    print("✅ Deployment verification passed!")
    return True

def start_server():
    """Avvia il server FastAPI"""
    print("\n🚀 Starting FastAPI server...")
    print("📍 Marketplace will be available at: http://localhost:8000/marketplace")
    print("⏹️  Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            "uvicorn", 
            "BackEnd.app.main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

def main():
    """Funzione principale"""
    print("🚀 Airvana Marketplace Deployment")
    print("=" * 50)
    
    # Verifica prerequisiti
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed!")
        print("📝 Please install Node.js and npm")
        sys.exit(1)
    
    # Build del marketplace
    if not build_marketplace():
        print("\n❌ Build failed!")
        sys.exit(1)
    
    # Verifica deployment
    if not verify_deployment():
        print("\n❌ Deployment verification failed!")
        sys.exit(1)
    
    print("\n🎉 Deployment completed successfully!")
    print("📝 Next steps:")
    print("   1. The marketplace is ready at: http://localhost:8000/marketplace")
    print("   2. You can start the server manually with:")
    print("      uvicorn BackEnd.app.main:app --reload --host 0.0.0.0 --port 8000")
    print("   3. Or run this script again to rebuild and start automatically")
    
    # Chiedi se avviare il server
    response = input("\n🤔 Do you want to start the server now? (y/N): ")
    if response.lower() == 'y':
        start_server()
    else:
        print("✅ Deployment completed. Start the server manually when ready.")

if __name__ == "__main__":
    main() 