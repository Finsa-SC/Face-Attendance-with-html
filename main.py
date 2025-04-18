from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import face_recognition, numpy as np, datetime, pyodbc, base64, cv2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_index():
    return FileResponse("static/index.html")

def connect_db():
    return pyodbc.connect(
        'DRIVER={ODBC Driver 17 for SQL Server};'
        r'SERVER=HOSHIMI\SQLEXPRESS01;'
        r'DATABASE=FaceAttendance_DB;'
        'Trusted_Connection=yes;'
    )

def find_user(face_encoding):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, face_encoding, profil FROM users")
    best, best_dist = None, 1.0
    for row in cursor.fetchall():
        stored = np.frombuffer(row.face_encoding, dtype=np.float64)
        dist = face_recognition.face_distance([stored], face_encoding)[0]
        if dist < best_dist and dist < 0.6:
            best_dist = dist
            best = {
                "id": row.id,
                "name": row.name,
                "role": row.role,
                "profil": row.profil,
                "confidence": round((1-dist)*100,2)
            }
    cursor.close(); conn.close()
    return best

def log_attendance(user_id):
    conn = connect_db(); c = conn.cursor()
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    c.execute(
      "SELECT COUNT(*) FROM attendance WHERE user_id=? AND CONVERT(date,timestamp)=?",
      (user_id, today)
    )
    count = c.fetchone()[0]
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if count==0:
        c.execute(
            "INSERT INTO attendance (user_id, timestamp) VALUES (?,?)",
            (user_id, ts)
        )
        conn.commit()
        new = True
    else:
        c.execute(
          "SELECT TOP 1 timestamp FROM attendance "
          "WHERE user_id=? AND CONVERT(date,timestamp)=? ORDER BY timestamp DESC",
          (user_id, today)
        )
        ts = c.fetchone()[0]
        new = False
    c.close(); conn.close()
    return ts, new

def encode_image_to_base64(img):
    _, buf = cv2.imencode('.jpg', img)
    return base64.b64encode(buf).decode('utf-8')

    #endpoint
@app.post("/detect-face")
async def detect_face(image: UploadFile = File(...)):
    contents = await image.read()
    arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    small = cv2.resize(img, (0,0), fx=0.25, fy=0.25)
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

    locs = face_recognition.face_locations(rgb)
    if not locs:
        return {"faceDetected": False}

    encs = face_recognition.face_encodings(rgb, locs)
    user = find_user(encs[0])
    if not user:
        return {"faceDetected": True, "userIdentified": False}

    ts, is_new = log_attendance(user["id"])
    profil_b64 = base64.b64encode(user["profil"]).decode('utf-8') if user.get("profil") else None

    return {
        "faceDetected": True,
        "userIdentified": True,
        "alreadyMarked": not is_new,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "role": user["role"],
            "attendanceTime": ts,
            "image": profil_b64
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
