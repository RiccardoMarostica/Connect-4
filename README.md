# Connect-4

Inside this file are present all the information to start the application, both server side and client side.
If you are inside the repository that contains two repositories called "backend-server" and "frontend-client", and also contains this file README
you have to use two terminals to start the application.

   PRECONDITIONS:

Before start to run server and client, it is necessary to install some tools that are used inside the application. The first one is NodeJS since it is the fundamental part for the server side. To install it just follow the instructions on the official page https://nodejs.org/it/. After install it, it is also present a package manager called npm used to managethe installation of additional modules and also more.

Then it is necessary install mongoDB. On this link https://docs.mongodb.com/manual/installation/ are present all the informations to install mongoDB inside your laptop based on which OS you are using.

   SERVER SIDE:

First, let's talk about the steps to run the server side. After you have installed mongoDB, you can try to run the server:

1. To enter inside the repository that contains the server side, use the terminal. To do so, just type inside the terminal:

   cd backend-server

2. After you're inside the repository, the first step is to get all the packages and modules used. To do so, type inside the terminal:

   npm install

   In this way, all the packages will be installed inside the repository

3. Next, it is necessary to compile everything. So, inside the terminal, type:

   npm run compile

   This will convert the typescript files in javascript files. It is possible that inside the terminal some errors will appear.
   In this case there is no problem, just continue.

4. Last step is run the server. To run it type:

   npm run start

   If the run is complite without errors, a new account with moderator roles is created. Here is informations that can be used to login inside the
   application:

      - Username: admin
      - Email: admin@connectfour.it
      - Password: admin

   Also, if the server is running, some messages as "Connect to MongoDB", "Creating admin user" and "HTTP Server started on port 8080" will appear inside the terminal. It is important to not close this terminal, otherwise the server will not run anymore.

   Useful commands to use for check collections and documents inside mongoDB are:

      - mongo  => open the mongo shell
      - use connectfour => access to connectfour database
      - show collections => show all the collections present inside the database
      - db.users.find({}) => show all the users inside the collection "users"
      - db.matches.find({}) => show all the matches inside the collection "matches"

   CLIENT-SIDE:

After the server is running, it is time to run the client side of the application. The first step is to install Angular. To do so, open a new terminal and type:

   npm install -g @angular/cli

The next step is to enter inside the repository that contains the client-side code. So open a new terminal which path is direct inside the repo that contains all the files. Then type:

   cd frontend-client

1. As made before with the server-side, import all the packages and modules needed:

   npm install

2. Then run the local webserver, typing:

   ng serve --open

   In this way, after compile all the files a web page will be opened and the you can access to the application. The url used to access inside the application is localhost:4200