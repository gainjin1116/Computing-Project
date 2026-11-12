import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# 1. Read and load the processed dataset
df = pd.read_csv('Processed_Sydney_AQI.csv', sep=r'\||,', engine='python')

# 2. Select the feature columns (X) and the target label (y)
X = df[['LUDD_T', 'LUDD_RH', 'LUDD_ws', 'LUDD_wd', 'LUDD_Rain', 'LUDD_p', 'Hour', 'DayOfWeek', 'Is_Holiday']]
y_cls = df['Safety_Level']

# 3. Split the data into training and testing sets (80% train, 20% test)
# A random_state is set to ensure reproducibility of the results.
X_train, X_test, y_cls_train, y_cls_test = train_test_split(X, y_cls, test_size=0.2, random_state=42)

# 4. Apply StandardScaler to normalize feature ranges (e.g., pressure ~1000 vs rain 0-1)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
# Note: The test set must be transformed using the same scaler fitted on the training set
X_test_scaled = scaler.transform(X_test)

# 5. Train the Random Forest Classifier
# class_weight='balanced' is used to heavily penalise misclassifications on rare 'Unsafe' days.
clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
clf.fit(X_train_scaled, y_cls_train)

# 6. Evaluate the model on the unseen test set
y_pred = clf.predict(X_test_scaled)
print("=" * 50)
print("MODEL EVALUATION RESULTS")
print("=" * 50)
# Prints the overall accuracy (used in Table 23)
print(f"Overall Accuracy: {accuracy_score(y_cls_test, y_pred):.4f}\n")
# Prints the classification report including per-class precision, recall, f1-score, and support
# This is the exact output needed for Appendix E (Figure 23)
print(classification_report(y_cls_test, y_pred, target_names=['Safe (0)', 'Caution (1)', 'Unsafe (2)']))

# 7. Save the trained scaler, model, and feature importances for the FastAPI backend
joblib.dump(scaler, 'scaler.pkl')
joblib.dump(clf, 'rf_model.pkl')

# Extract and save feature importances (used for the horizontal bar chart)
feature_importances = dict(zip(X.columns, clf.feature_importances_))
joblib.dump(feature_importances, 'feature_importances.pkl')

print("=" * 50)
print("Models, Scaler, and Feature Importances saved successfully!")