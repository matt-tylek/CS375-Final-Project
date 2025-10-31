# CS375-Final-Project: Petfinder

## PetFinder:

A web application built using Node.js and Express to serve static HTML, with Axios handling client-side API requests and PostgreSQL managing pet data.

API Doc: https://www.petfinder.com/developers/v2/docs/

## How to Run:

1) Ensure Node.js (which includes npm) and a running PostgreSQL database instance is installed and accessible.

2) Install all dependencies in package.json: `npm install`

3) Ensure PostgresSQL and API configuration details are set in env.json 

For example: 

```
{
  "user": "postgres",
  "host": "localhost",
  "database": "petfinder",
  "password": "YOUR_DB_PASSWORD",
  "port": 5432,

  "api_key": "YOUR_PETFINDER_API_KEY",
  "api_secret": "YOUR_PETFINDER_API_SECRET"
}

```

4) Start server: `npm start`

5) Access at: http://localhost:3000