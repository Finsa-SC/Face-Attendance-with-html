
---

# Face Attendance System

A face recognition-based attendance system with a Python backend and web frontend. Built using:
- **Backend**: Python, FastAPI, Face Recognition, OpenCV, SQL Server  
- **Frontend**: HTML, CSS, JavaScript (developed by partner)

## Project Structure
```
├── main.py              # Main backend and API
├── add_user.py          # User registration script
├── static/              # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── script.js
```

## System Requirements
1. ODBC Driver 17 for SQL Server  
2. Python 3.7+  
3. A running SQL Server instance  

## Installation
1. Install Python dependencies:
```bash
pip install fastapi uvicorn face-recognition opencv-python pyodbc python-multipart
```

2. Set up the SQL Server database:
```sql
CREATE DATABASE FaceAttendance_DB;
GO
USE FaceAttendance_DB;
GO

CREATE TABLE users (
    id VARCHAR(8) PRIMARY KEY IDENTITY,
    name VARCHAR(50),
    role VARCHAR(50),
    face_encoding VARBINARY(MAX),
    profil VARBINARY(MAX)
);

CREATE TABLE attendance (
    id INT PRIMARY KEY IDENTITY,
    user_id INT FOREIGN KEY REFERENCES users(id),
    timestamp DATETIME
);
```

3. Configure database connection in `main.py`:
```python
def connect_db():
    return pyodbc.connect(
        'DRIVER={ODBC Driver 17 for SQL Server};'
        r'SERVER=.;'
        r'DATABASE=FaceAttendance_DB;'
        'Trusted_Connection=yes;'
    )
```

## Running the System
1. Start the FastAPI server:
```bash
uvicorn main:app --reload --port 5000
```

2. Access the frontend at `http://localhost:5000`

## User Registration
Use the `add_user.py` script (example implementation):
```python
# Example add_user.py
import cv2
import pyodbc
import face_recognition

def register_user(name, role, image_path):
    # Implements face encoding capture
    # and stores data into the database
    pass
```

Required input:
- ID  
- User name  
- Role  
- Face photo (JPEG/PNG format)  

## API Endpoints
### POST `/detect-face`
- **Purpose**: Detect and recognize face for attendance
- **Input**: Image file (face to be detected)
- **Response**:
```json
{
  "faceDetected": boolean,
  "userIdentified": boolean,
  "alreadyMarked": boolean,
  "user": {
    "id": int,
    "name": string,
    "role": string,
    "attendanceTime": string,
    "image": string (base64)
  }
}
```

## System Workflow
1. User opens the frontend web page  
2. Webcam captures the user's face  
3. The image is sent to the `/detect-face` endpoint  
4. The system:
   - Detects the face  
   - Extracts facial features  
   - Matches with the database  
   - Records attendance if valid  
5. Results are shown on the frontend  

## Face Configuration
- Similarity threshold: 0.6 (can be adjusted in `find_user()`)  
- Image processing size: 25% of original resolution  
- Encoding format: Stored as VARBINARY in the database  

## Development Notes
### Core Technologies
- `face_recognition` for facial feature extraction  
- `OpenCV` for image processing  
- `FastAPI` for RESTful API  
- `pyodbc` for SQL Server connection  

### Important Notes
1. Ensure the database connection is configured correctly  
2. For production environments:
   - Use stricter CORS policies  
   - Optimize face recognition parameters  
   - Implement API authentication  
3. Profile images are stored as base64 strings  

## License
MIT License

---
