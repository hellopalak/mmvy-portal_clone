# Portal Demo Server

This is a small server for the portal demo. It reads and updates users in a PostgreSQL table named portal_users.

It also has a small React frontend. A person enters a portal ID, sees the profile, and gets an automatic update when that user's data changes.

## The table

The server expects this table:

~~~
portal_users
~~~

porta is the user's portal ID and primary key. The demo can update these columns:

~~~
address
income
caste_category
mobile_number
~~~

To update another column later, add its exact database column name to UPDATABLE_FIELDS in backend/index.js.

## Start the server

1. In the backend folder, copy .env.example and rename the copy to .env.
2. Put your PostgreSQL connection string in DATABASE_URL.
3. For Neon or another hosted database, leave POSTGRES_SSL=true.
4. Start the API:

~~~powershell
cd backend
npm.cmd install
npm.cmd run dev
~~~

The server runs at:

~~~
http://localhost:4000
~~~

## Start the frontend

Open another terminal:

~~~powershell
cd frontend
npm.cmd install
npm.cmd run dev
~~~

Open this address in the browser:

~~~
http://localhost:5173
~~~

Enter a portal ID. The frontend opens that user's profile at /profile/<portal-id>.

## Get one user

Use this endpoint:

~~~http
GET /api/users/:portalId
~~~

Example:

~~~
GET http://localhost:4000/api/users/PORTAL-1001
~~~

If the user exists, the server sends:

~~~json
{
  "success": true,
  "message": "User details retrieved successfully.",
  "data": {
    "porta": "PORTAL-1001",
    "address": "Pune",
    "income": 500000,
    "caste_category": "OBC",
    "mobile_number": "9876543210"
  }
}
~~~

If no user has that portal ID, the server sends status 404:

~~~json
{
  "success": false,
  "message": "User not found."
}
~~~

## Update one user

Use this endpoint:

~~~http
POST /api/users/:portalId
Content-Type: application/json
~~~

Send only the details that need to change. One field or many fields can be sent together.

Example:

~~~http
POST http://localhost:4000/api/users/PORTAL-1001
Content-Type: application/json

{
  "address": "New Delhi",
  "income": 650000,
  "mobile_number": "9876543210"
}
~~~

If the update works, the server sends status 200:

~~~json
{
  "success": true,
  "message": "User details updated successfully.",
  "data": {
    "porta": "PORTAL-1001",
    "address": "New Delhi",
    "income": 650000,
    "caste_category": "OBC",
    "mobile_number": "9876543210"
  }
}
~~~

If the request has none of the allowed fields, the server sends status 400:

~~~json
{
  "success": false,
  "message": "Send at least one allowed field to update."
}
~~~

If the portal ID does not exist, it sends status 404 with User not found. If PostgreSQL has a problem, it sends status 500.

## Automatic profile updates

The frontend joins a small Socket.IO group for the portal ID being viewed. After a successful POST update, the server sends the new user data to that group. The open profile page updates immediately without a refresh.

## Health check

Use this address to check that the server can reach PostgreSQL:

~~~
GET http://localhost:4000/api/health
~~~

It returns success: true when the server and database are working.

## Important for this demo

This server has no login or permission system. Anyone who can reach the API can request or change data. Add authentication before using it outside a private demo.
