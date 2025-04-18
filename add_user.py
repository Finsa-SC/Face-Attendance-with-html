from importlib import import_module

import face_recognition
import pyodbc
import io
from PIL import Image

SERVER = "."
DATABASE = "FaceAttendance_DB"

def connect_db():
    return pyodbc.connect(
        f'DRIVER={{ODBC Driver 17 for SQL Server}};'
        f'SERVER={SERVER};'
        f'DATABASE={DATABASE};'
        f'Trusted_Connection=yes;'
    )

def insert_user(id, name, role, image_path):
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)

    if len(encodings)==0:
        print(f"Gagal membaca wajah {image_path}")
        return

    face_encoding = encodings[0]
    face_encodings_bytes = face_encoding.tobytes()

    pil_image = Image.open(image_path)

    img_byte_arr = io.BytesIO()

    pil_image.save(img_byte_arr, format='JPEG')
    image_bytes = img_byte_arr.getvalue()

    try:
        conn = connect_db()
        c = conn.cursor()

        c.execute("INSERT INTO users (id, name, role, face_encoding, profil) VALUES (?,?,?,?,?)",
                  (id, name, role, face_encodings_bytes, image_bytes)
        )
        conn.commit()
        print(f"Print: Berhasil menambah user: {name}")

    except Exception as e:
        print(f"Error Insert: {str(e)}")
    finally:
        c.close()
        conn.close()

if __name__ == "__main__":
    insert_user(
        id="00000000",
        name="Example_Name",
        role="Exampel_Role",
        image_path=r"D:\User\Path\Image.png"
    )