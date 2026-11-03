import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

# 1. Read data
df = pd.read_csv('Processed_Sydney_AQI.csv', sep=r'\||,', engine='python')

# 2. Prepare features
X = df[['LUDD_T', 'LUDD_RH', 'LUDD_ws', 'LUDD_wd', 'LUDD_Rain', 'LUDD_p', 'Hour', 'DayOfWeek', 'Is_Holiday']]
y_cls = df['Safety_Level']

# 3. Split and scale
X_train, X_test, y_cls_train, y_cls_test = train_test_split(X, y_cls, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)

# 4. Train Random Forest
clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
clf.fit(X_train_scaled, y_cls_train)

# 5. Save models and feature importances
joblib.dump(scaler, 'scaler.pkl')
joblib.dump(clf, 'rf_model.pkl')
feature_importances = dict(zip(X.columns, clf.feature_importances_))
joblib.dump(feature_importances, 'feature_importances.pkl')

print("Models and Scaler saved successfully!")