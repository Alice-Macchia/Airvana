# API Documentation

## Authentication Endpoints

### POST /login
- Authenticates user with email and password
- Returns JWT token as cookie
- Form parameters: loginEmail, loginPassword

### GET /auth/google
- Redirects to Google for OAuth authentication

### GET /auth/google/callback
- Handles Google OAuth callback
- Requires 'code' query parameter

### GET /logout
- Logs out the user by deleting the access token cookie

## User Management Endpoints

### POST /register
- Unified registration endpoint for all user types (farmer, society, agronomist)
- Request body: Contains user_type and profile details
- Returns success message
- Raises HTTPException if email already exists, invalid user_type, or registration fails

### GET /api/user/profile
- Gets complete user profile data
- Requires authentication
- Returns user info and associated entities

## Plot Management Endpoints

### GET /get-user-terreni/{user_id}
- Returns plots for specified user in frontend format
- Includes detailed plot information with species and coordinates
- Requires user_id as path parameter

### POST /save-plot
- Saves a new plot to database
- Request body: plot data with name and species

### POST /save-coordinates
- Saves coordinates for a new plot
- Request body: SaveCoordinatesRequest schema

### PUT /update-terrain
- Updates an existing terrain (name and/or species)
- Request body: TerrainUpdateRequest schema

### DELETE /delete-terrain
- Deletes a terrain and all its associated data
- Request body: TerrainDeleteRequest schema

### PUT /update-species
- Updates a single species entry for a terrain plot
- Request body: SpeciesUpdateRequest schema

### PUT /update-terrain-coordinates
- Updates geographical coordinates of an existing terrain plot
- Request body: TerrainCoordinatesUpdateRequest schema

### DELETE /delete-species
- Deletes a single species association from a terrain plot
- Request body: SpeciesDeleteRequest schema

### GET /api/users/me/plots
- Gets all plots of current user with their species
- Requires authentication

### GET /api/get_all_plots
- Gets coordinates for all plots in the system

## Weather and CO2/O2 Endpoints

### POST /weather/{plot_id}
- Fetches weather data from API and saves to DB
- Requires plot_id as path parameter

### GET /weather/{plot_id}
- Gets weather data for a specific plot and date
- Query parameter: giorno (date)

### GET /api/weather/exists
- Checks if weather data exists for a plot and date
- Query parameters: plot_id, giorno (date)

### GET /calcola_co2/{plot_id}
- Calculates CO2 absorption for a specific plot
- Query parameter: giorno (date), defaults to today
- Requires authentication and plot ownership verification

### POST /co2_by_species/{plot_id}
- Returns CO2/O2 breakdown per plant species in plot
- Useful for interactive charts showing species contribution

## Species Management Endpoints

### GET /species/{plot_id}
- Gets species distribution for a specific plot
- Requires plot_id as path parameter

## Dashboard and Summary Endpoints

### GET /api/plots/{plot_id}/summary
- Returns synthetic metrics for dashboard cards
- Calculates total CO2 absorption, O2 production, average precipitation, temperature min/max
- Requires authentication and plot ownership verification

## Classification and Export Endpoints

### GET /classifica
- Gets classification data
- Request body: ClassificaRequest schema

### GET /esporta
- Exports data as PDF
- Request body: EsportaRequest schema

## Utility Endpoints

### GET /
- Home page route

### GET /logreg
- Root endpoint that handles user authentication and redirection
- Checks if user has a valid JWT token in cookies and redirects to dashboard if authenticated, otherwise serves the login page

### GET /dashboard
- Dashboard page route
- Requires authentication

### GET /profilo
- User profile page route
- Requires authentication

### GET /inserisciterreno
- Page for adding new terrain
- Requires authentication

### GET /demo
- Demo page route

## Marketplace Endpoints

### GET /marketplace/
- Serves marketplace index file from React build
- Serves the file index.html from dist directory of airvana-marketplace

## Miscellaneous Endpoints

### GET /api/plots/{plot_id}/summary
- Returns synthetic metrics for dashboard cards
- Calculates total CO2 absorption, O2 production, average precipitation, temperature min/max
- Requires authentication and plot ownership verification