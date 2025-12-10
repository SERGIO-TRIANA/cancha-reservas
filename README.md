# Cancha Reservas

Este proyecto es una aplicación web para la gestión de reservas de canchas deportivas. Está dividido en dos partes principales: el **backend** y el **frontend**.

---

## **Requisitos previos**

### **Herramientas necesarias**
- **Node.js** (versión 16 o superior)
- **Angular CLI** (versión 15 o superior)
- **PostgreSQL** (versión 13 o superior)
- **Git**

### **Base de datos**
1. Instala PostgreSQL y asegúrate de que el servicio esté corriendo.
2. Crea una base de datos llamada `cancha_reservas`.
3. Ejecuta el script SQL ubicado en `backend/sql/` para crear las tablas necesarias y poblar datos iniciales.
   - Puedes usar el siguiente comando en `psql`:
     ```sql
     \i ruta/del/script.sql
     ```

---

## **Instalación**

### **1. Clonar el repositorio**
Clona el repositorio en tu máquina local:
```bash
git clone https://github.com/SERGIO-TRIANA/cancha-reservas.git
cd cancha-reservas
```

### **2. Configurar el Backend**
1. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   - Crea un archivo `.env` en la carpeta `backend` con el siguiente contenido:
     ```env
     DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/cancha_reservas
     PORT=3000
     JWT_SECRET=tu_secreto
     ```
   - Reemplaza `usuario` y `contraseña` con tus credenciales de PostgreSQL.
4. Inicia el servidor:
   ```bash
   npm start
   ```
   El backend estará disponible en `http://localhost:3000`.

### **3. Configurar el Frontend**
1. Navega a la carpeta del frontend:
   ```bash
   cd ../frontend/frontend-cancha
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   ng serve
   ```
   El frontend estará disponible en `http://localhost:4200`.

---

## **Estructura del proyecto**

### **Backend**
- **`src/`**: Contiene la lógica del servidor.
  - **`controller/`**: Controladores para manejar la lógica de negocio.
  - **`routes/`**: Define las rutas de la API.
  - **`middlewares/`**: Middleware para validaciones y autenticación.
  - **`types/`**: Interfaces y tipos de TypeScript.
- **`sql/`**: Scripts para la base de datos.

### **Frontend**
- **`src/app/`**: Contiene los componentes, servicios y módulos de Angular.
  - **`pages/`**: Vistas principales (login, dashboard, etc.).
  - **`services/`**: Servicios para manejar la lógica de negocio del cliente.
  - **`interfaces/`**: Interfaces para los datos que maneja el frontend.

---

## **Pruebas**

### **Backend**
1. Instala las dependencias de prueba:
   ```bash
   npm install --save-dev jest supertest ts-jest @types/jest
   ```
2. Ejecuta las pruebas:
   ```bash
   npx jest
   ```

### **Frontend**
1. Ejecuta las pruebas unitarias:
   ```bash
   ng test
   ```

---

## **Notas adicionales**
- Asegúrate de que los puertos `3000` (backend) y `4200` (frontend) estén disponibles.
- Si necesitas cambiar la configuración de la base de datos, actualiza el archivo `.env` en el backend.
- Para producción, asegúrate de configurar correctamente las variables de entorno y usar un servidor como **Nginx** para servir el frontend.

---

## **Contacto**
Si tienes alguna duda o problema, puedes contactar al desarrollador principal:
- **Nombre**: Sergio Triana
- **Correo**: sergio.triana@example.com