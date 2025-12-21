# PetConnect: Pet Adoption Marketplace

**PetConnect** is a web application that connects pet owners with adopters, providing a seamless platform to browse, post, and adopt pets. Users can chat in real time with pet owners through a built-in direct messaging feature powered by WebSockets and complete adoptions securely using Stripe Checkout.

## Features

- **Marketplace for Pets:** Users can browse pets available for adoption, post pets for adoption, and search with filters.  
- **Real-Time Chat:** Direct messaging between adopters and pet owners to facilitate communication.  
- **Secure Adoptions:** Stripe integration for safe and smooth adoption payments.  
- **Responsive UI:** User-friendly interface for both desktop and mobile users.  

## Technologies

- Node.js, Express, Axios  
- PostgreSQL for data storage  
- WebSockets for real-time messaging  
- Stripe Checkout for secure payments  
- HTML, CSS, JavaScript for frontend


## How to Run:

1) Ensure Node.js (which includes npm) and a running PostgreSQL database instance is installed and accessible.

2) Install all dependencies in package.json: `npm install`

3) Ensure PostgresSQL and API configuration details are set in env.json in your root directory of project

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
