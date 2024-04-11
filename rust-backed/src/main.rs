use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use mongodb::{Client, options::ClientOptions, Database};
use jsonwebtoken::{encode, EncodingKey, Header};
use bcrypt::{hash, verify, DEFAULT_COST};
use std::env;
use mongodb::bson::doc;


#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct User {
    email: String,
    password: String,
}

#[derive(Clone)]
struct AppState {
    db: Database,
}

async fn register(user: web::Json<User>, data: web::Data<AppState>) -> impl Responder {
    let hashed_password = hash(&user.password, DEFAULT_COST).unwrap();
    let new_user = User {
        email: user.email.clone(),
        password: hashed_password,
    };

    let collection = data.db.collection::<User>("users");
    collection.insert_one(new_user, None).await.unwrap();

    HttpResponse::Ok().json("User registered successfully")
}

async fn login(user: web::Json<User>, data: web::Data<AppState>) -> impl Responder {
    let collection = data.db.collection::<User>("users");
    let result = collection.find_one(doc! {"email": &user.email}, None).await.unwrap();

    match result {
        Some(db_user) => {
            if verify(&user.password, &db_user.password).unwrap() {
                let claims = Claims {
                    sub: db_user.email,
                    exp: 10000000000,
                };
                let token = encode(&Header::default(), &claims, &EncodingKey::from_secret("secret".as_ref())).unwrap();
                HttpResponse::Ok().json(token)
            } else {
                HttpResponse::Unauthorized().json("Invalid credentials")
            }
        }
        None => HttpResponse::Unauthorized().json("User not found"),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let client_options = ClientOptions::parse("mongodb+srv://ayushlanka106:wCrF79lzDI6vKWcq@cluster0.7by8a1a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0").await.unwrap();
    let client = Client::with_options(client_options).unwrap();
    let db = client.database("hack_uncc");

    let app_state = AppState { db };

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .wrap(cors)
            .service(web::resource("/register").route(web::post().to(register)))
            .service(web::resource("/login").route(web::post().to(login)))
    })
    .bind("0.0.0.0:8000")?
    .run()
    .await
}
