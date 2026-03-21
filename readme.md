## dependencies

# multer
  - in order to get the file buffer without doing the fs.readFile 
  - in order to get file buffer through the http request

# pdf2json
  - for parsing pdf

# .env contents:
  - PORT
  - DB_USER
  - DB_HOST
  - DB_NAME
  - DB_PASS
  - JWT_SECRET=secret-key-placeholder

# placeholders for the JWT
auth.middleware.js is using the .env JWT_SECRET for checking
authorization headers are "Bearer [token]"


# token handling
the written code for handling the JWT is only for testing, 
later on it will be replaced to be saving on cookies.


# TO DO
  routes
    - clean up functions in routes to be controllers
    - fetching for files
    - sanitization of file content