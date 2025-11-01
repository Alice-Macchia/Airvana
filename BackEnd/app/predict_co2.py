import joblib
import numpy as np
import pandas as pd

# 🔹 Carico il modello Random Forest salvato
model = joblib.load("co2_random_forest_model.pkl")

# 🔮 Funzione per fare una previsione singola
def predict_co2(temp_avg_7d, rad_avg_7d, meteo_avg_7d, precip_sum_7d):
    X_input = np.array([[temp_avg_7d, rad_avg_7d, meteo_avg_7d, precip_sum_7d]])
    co2_pred = model.predict(X_input)[0]
    return round(co2_pred, 5)

# Esempi di utilizzo commentati:
#
# ESEMPIO 1: input singolo (simulato o reale)
# co2_val = predict_co2(12.4, 6.3, 0.45, 5.8)
#
# ESEMPIO 2: batch di dati multipli (pandas DataFrame)
# df_test = pd.DataFrame([
#     {"temp_avg_7d": 10, "rad_avg_7d": 5, "meteo_avg_7d": 0.3, "precip_sum_7d": 8},
#     {"temp_avg_7d": 15, "rad_avg_7d": 7, "meteo_avg_7d": 0.6, "precip_sum_7d": 2},
#     {"temp_avg_7d": 18, "rad_avg_7d": 9, "meteo_avg_7d": 0.8, "precip_sum_7d": 0}
# ])
#
# Previsioni in batch
# df_test["co2_predicted"] = model.predict(df_test).round(5)
