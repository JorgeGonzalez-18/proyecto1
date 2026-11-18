# API Cabina - Centro Cultural

API RESTful backend desarrollada con **Node.js**, **Express** y **MongoDB (Mongoose)** para la gestión integral de un centro cultural: administración de salas de ensayo, bandas musicales, músicos, préstamos de equipo y reservas de horarios con soporte para **transacciones ACID multi-documento**.

---

## Integrantes del Proyecto

- Jorge Gonzalez Carranza
- Douglas Ordonez
- Alejandro Gomez
- Alejandro Umana

---

## Tecnologías y Dependencias

- **Node.js** (Entorno de ejecución)
- **Express.js v5** (Framework HTTP y enrutamiento)
- **MongoDB Atlas** (Base de datos NoSQL con Replica Set)
- **Mongoose v9** (ODM para modelado de datos y transacciones)
- **dotenv** (Gestión de variables de entorno)
- **nodemon** (Recarga automática en desarrollo)

---

## Instalación y Puesta en Marcha

### 1. Clonar o descargar el proyecto

Abrir una terminal en el directorio raíz del proyecto (`Cabina`):

```bash
cd Cabina
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno (`.env`)

Crear un archivo `.env` en la raíz de la carpeta `Cabina` tomando como referencia el archivo `.env.example`:

```env
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.xxxx.mongodb.net/cabina?retryWrites=true&w=majority
```

### 4. Iniciar el servidor en modo desarrollo

```bash
npm run dev
```

La consola confirmará la conexión a MongoDB Atlas y levantará el servidor en:

```
[MongoDB] Base de datos conectada exitosamente a Atlas (cabina)
Server running on port http://localhost:3000
```

---

## Arquitectura del Proyecto

```text
Cabina/
├── src/
│   ├── config/
│   │   └── db.js                 # Conexión a MongoDB Atlas y resolución DNS
│   ├── models/
│   │   ├── Room.js               # Modelo Sala (validaciones, tipos e índices)
│   │   ├── Band.js               # Modelo Banda (virtual populate para músicos)
│   │   ├── Musician.js           # Modelo Músico (índices y relación a Banda)
│   │   ├── Equipment.js          # Modelo Equipo (inventario y categorías)
│   │   ├── Booking.js            # Modelo Reserva (índice compuesto y virtual durationHours)
│   │   └── Loan.js               # Modelo Préstamo (índices de búsqueda)
│   ├── controllers/
│   │   ├── roomController.js     # Lógica de salas y estadísticas
│   │   ├── bandController.js     # Lógica de bandas y subrecursos
│   │   ├── musicianController.js # Lógica de músicos y filtros
│   │   ├── equipmentController.js# Lógica de equipos y control de inventario
│   │   ├── bookingController.js  # Lógica de reservas y Transacciones ACID
│   │   └── loanController.js     # Consulta de préstamos generados
│   ├── routes/
│   │   ├── roomRoutes.js         # Rutas de /api/rooms
│   │   ├── bandRoutes.js         # Rutas de /api/bands
│   │   ├── musicianRoutes.js     # Rutas de /api/musicians
│   │   ├── equipmentRoutes.js    # Rutas de /api/equipment
│   │   ├── bookingRoutes.js      # Rutas de /api/bookings
│   │   └── loanRoutes.js         # Rutas de /api/loans
│   ├── middlewares/
│   │   ├── queryHelper.js        # Helper para paginación, orden y búsqueda
│   │   └── errorHandler.js       # Manejo centralizado de errores (400, 404, 409, 500)
│   ├── app.js                    # Configuración de Express y middlewares
│   └── server.js                 # Punto de entrada y arranque del puerto
├── .env                          # Variables de entorno privadas
├── .env.example                  # Plantilla pública sin credenciales
├── package.json
└── README.md
```

---

## Sección: Índices de Base de Datos

Cada índice declarado en los schemas de Mongoose tiene un propósito técnico y optimiza consultas específicas requeridas en el sistema:

| Modelo          | Definición del Índice                | Tipo                   | Justificación Técnica y Consulta Optimizada                                                                                                                                                                                                                    |
| :-------------- | :----------------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Room`**      | `{ name: 1 }`                        | Único (`unique: true`) | Garantiza a nivel de motor de base de datos que no existan dos salas con el mismo nombre. Acelera las búsquedas por nombre en `GET /api/rooms?search=...`.                                                                                                     |
| **`Band`**      | `{ name: 1 }`                        | Único (`unique: true`) | Evita nombres de bandas repetidos y acelera el ordenamiento por defecto (`sort=name`) y búsquedas por nombre.                                                                                                                                                  |
| **`Musician`**  | `{ email: 1 }`                       | Único (`unique: true`) | Asegura que cada músico tenga un correo electrónico irrepetible en el sistema. Optimiza la verificación de duplicados al crear o editar músicos.                                                                                                               |
| **`Musician`**  | `{ band: 1 }`                        | Secundario             | Optimiza de forma drástica la consulta `GET /api/bands/:id/musicians` y los filtros `GET /api/musicians?band=...`, evitando un escaneo completo de la colección (_full collection scan_).                                                                      |
| **`Equipment`** | `{ name: 1 }`                        | Único (`unique: true`) | Asegura nombres únicos en el inventario de instrumentos y equipos.                                                                                                                                                                                             |
| **`Booking`**   | `{ room: 1, date: 1, startHour: 1 }` | Compuesto              | **Índice clave de la aplicación**. Optimiza dos operaciones críticas: (1) El endpoint de horario `GET /api/rooms/:id/schedule?date=...` y (2) La verificación en tiempo real de traslapes de horario durante la creación de reservas dentro de la transacción. |
| **`Loan`**      | `{ booking: 1 }`                     | Secundario             | Acelera la búsqueda de todos los préstamos vinculados a una reserva al momento de cancelarla (`PATCH /api/bookings/:id/cancel`) para devolver el equipo al inventario.                                                                                         |
| **`Loan`**      | `{ equipment: 1, status: 1 }`        | Compuesto              | Permite consultar de forma casi instantánea cuántos préstamos activos (`status: "prestado"`) tiene un equipo determinado, utilizado para validar la integridad del inventario.                                                                                 |

---

## Sección: Transacción ACID

### 1. ¿En qué funciones está implementada?

Las transacciones están ubicadas en el controlador [`src/controllers/bookingController.js`] en dos funciones críticas:

1. **`createBooking`**: Creación de una reserva apartada junto con sus préstamos y reserva de inventario.
2. **`cancelBooking`**: Cancelación de la reserva, devolución de préstamos y reintegro del inventario.

### 2. ¿Qué colecciones toca cada transacción?

Ambas transacciones operan sobre **tres colecciones simultáneamente**:

1. **`bookings`**: Registra la reserva en estado `"apartada"` o cambia su estado a `"cancelada"`.
2. **`loans`**: Inserta los documentos de préstamo en estado `"prestado"` o los actualiza a `"devuelto"`.
3. **`equipment`**: Actualiza de forma atómica el campo `availableUnits` utilizando el operador **`$inc`** (`$inc: { availableUnits: -units }` al apartar, y `$inc: { availableUnits: +units }` al cancelar).

### 4. ¿Cómo probar los escenarios de Conflicto (`409 Conflict`)?

Se pueden realizar las siguientes pruebas en Postman para verificar que las transacciones y las reglas de negocio responden con código **`409 Conflict`**:

1. **Conflicto de Inventario Insuficiente (Transacción):**
   - Crear un equipo con `totalUnits: 2` (empieza con `availableUnits: 2`).
   - Enviar un `POST /api/bookings` solicitando `units: 3` de ese equipo.
   - **Resultado esperado:** Código `409` con el mensaje:  
     `"No hay suficientes unidades disponibles de [Equipo]. Disponibles: 2, solicitadas: 3"`.  
     _(La reserva no se crea y `availableUnits` permanece intacto en 2)._

2. **Conflicto de Traslape de Horario (Transacción):**
   - Crear una reserva en la Sala 1 para la fecha `2026-11-10` de `10:00` a `13:00` (`startHour: 10, endHour: 13`).
   - Enviar otra petición `POST /api/bookings` para la misma Sala 1 y la misma fecha, pero de `12:00` a `14:00` (`startHour: 12, endHour: 14`).
   - **Resultado esperado:** Código `409` con el mensaje:  
     `"Existe un conflicto de horario con otra reserva activa en esta sala"`.

3. **Conflicto por Cancelación Repetida (Transacción):**
   - Cancelar una reserva existente mediante `PATCH /api/bookings/:id/cancel` (responde `200` y libera el equipo).
   - Enviar inmediatamente de nuevo la petición `PATCH /api/bookings/:id/cancel` para la misma reserva.
   - **Resultado esperado:** Código `409` con el mensaje:  
     `"La reserva ya se encuentra cancelada"`.

4. **Conflicto de Reducción de Inventario (`PUT /api/equipment/:id`):**
   - Teniendo un equipo con 2 unidades prestadas en una reserva activa, intentar hacer un `PUT` cambiando `totalUnits: 1`.
   - **Resultado esperado:** Código `409` indicando que `totalUnits` no puede ser menor a las unidades actualmente prestadas.

5. **Conflicto de Borrado Protegido:**
   - Intentar eliminar una sala (`DELETE /api/rooms/:id`) o una banda (`DELETE /api/bands/:id`) que tienen reservas activas (`apartada` o `confirmada`).
   - Intentar eliminar una banda que aún tiene músicos asociados.
   - Intentar eliminar un equipo que tiene unidades actualmente prestadas (`availableUnits < totalUnits`).
   - **Resultado esperado:** Código `409` impidiendo el borrado en cada uno de estos casos.

---

## Resumen de Endpoints de la API

### Salas (`/api/rooms`)

- `GET /api/rooms` - Listado con paginación, orden y búsqueda.
- `POST /api/rooms` - Crear sala (`201`).
- `GET /api/rooms/stats` - Estadísticas de reservas activas por sala (`$aggregate`).
- `GET /api/rooms/:id` - Detalle de sala.
- `PUT /api/rooms/:id` - Actualizar sala.
- `DELETE /api/rooms/:id` - Borrado protegido (`409` si tiene reservas activas).
- `GET /api/rooms/:id/schedule?date=YYYY-MM-DD` - Horario del día ordenado por `startHour` con banda poblada.

### Bandas (`/api/bands`)

- `GET /api/bands` - Listado con paginación, orden y búsqueda.
- `POST /api/bands` - Crear banda (`201`).
- `GET /api/bands/:id` - Detalle de banda con músicos asociados poblados.
- `PUT /api/bands/:id` - Actualizar banda.
- `DELETE /api/bands/:id` - Borrado protegido (`409` si tiene reservas activas o músicos).
- `GET /api/bands/:id/musicians` - Subrecurso: lista los músicos de la banda.
- `GET /api/bands/:id/bookings` - Subrecurso: lista las reservas de la banda con la sala poblada.

### Músicos (`/api/musicians`)

- `GET /api/musicians` - Listado con paginación (filtros `?band=` y `?active=`).
- `POST /api/musicians` - Crear músico (`201`).
- `GET /api/musicians/:id` - Detalle de músico con la banda poblada.
- `PUT /api/musicians/:id` - Actualizar músico.
- `DELETE /api/musicians/:id` - Eliminar músico.

### Equipo (`/api/equipment`)

- `GET /api/equipment` - Listado con paginación (filtros `?category=` y `?available=true`).
- `POST /api/equipment` - Crear equipo (`201`).
- `GET /api/equipment/stats` - Estadísticas de unidades totales y disponibles por categoría (`$aggregate`).
- `GET /api/equipment/:id` - Detalle de equipo.
- `PUT /api/equipment/:id` - Actualizar equipo (`409` si `totalUnits` queda por debajo de unidades prestadas).
- `DELETE /api/equipment/:id` - Borrado protegido (`409` si tiene unidades prestadas).

### Reservas (`/api/bookings`)

- `GET /api/bookings` - Listado con paginación (filtros `status`, `room`, `band`, `date`, `from`, `to`).
- `POST /api/bookings` - Crear reserva con **Transacción ACID** (`201`).
- `GET /api/bookings/stats` - Conteo de reservas por estado (`$aggregate`).
- `GET /api/bookings/:id` - Detalle con sala, banda (músicos activos) y préstamos con equipo.
- `PUT /api/bookings/:id` - Actualizar reserva (revalida reglas y traslape).
- `PATCH /api/bookings/:id/cancel` - Cancelar reserva con **Transacción ACID** y reintegro de inventario.

### Préstamos (`/api/loans`)

- `GET /api/loans` - Listado con paginación (filtros `status`, `booking`, `equipment`).
- `GET /api/loans/:id` - Detalle con reserva y equipo poblados.
