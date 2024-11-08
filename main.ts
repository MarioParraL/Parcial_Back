import { MongoClient, ObjectId } from "mongodb";
import { AutorModel, LibroModel } from "./types.ts";
import { fromModelToLibro } from "./utils.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.error("Need a MONGO_URL");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("ParcialDB");
const librosCollection = db.collection<LibroModel>("libros");
const autoresCollection = db.collection<AutorModel>("autores");

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") {
    if (path === "/libros") {
      const titulo = url.searchParams.get("titulo");
      if (titulo) {
        const librosDB = await librosCollection.find({ titulo }).toArray();
        const libros = await Promise.all(
          librosDB.map((l) => fromModelToLibro(l, autoresCollection)),
        );
        return new Response(JSON.stringify(libros));
      } else {
        const librosDB = await librosCollection.find().toArray();
        const libros = await Promise.all(
          librosDB.map((l) => fromModelToLibro(l, autoresCollection)),
        );
        return new Response(JSON.stringify(libros));
      }
    } else if (path === "/libro") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Bad request", { status: 404 });
      const libroDB = await librosCollection.findOne({ _id: new ObjectId(id) });
      if (!libroDB) {
        return new Response("error: Libro no encontrado", { status: 404 });
      }
      const libro = await fromModelToLibro(libroDB, autoresCollection);
      return new Response(JSON.stringify(libro));
    }
  } else if (method === "POST") {
    if (path === "/libro") {
      const libro = await req.json();
      if (!libro.titulo || !libro.autores) {
        return new Response(
          "Bad Resquest: El titulo y los autores son campos requeridos",
          { status: 400 },
        );
      }

      const autores: ObjectId[] = libro.autores
        ? libro.autores.map((autorId: string) => new ObjectId(autorId))
        : [];

      const { insertedId } = await librosCollection.insertOne({
        titulo: libro.titulo,
        autores: libro.autores,
        copias: libro.copias,
      });

      return new Response(
        JSON.stringify({
          titulo: libro.titulo,
          autores: autores.map((autorId) => autorId.toString()),
          copias: libro.copias,
          id: insertedId,
        }),
      );
    } else if (path === "/autor") {
      const autor = await req.json();
      if (!autor.nombre || !autor.biografia) {
        return new Response(
          "Bad Resquest: El nombre y la bio son campos requeridos",
          { status: 400 },
        );
      }

      const { insertedId } = await autoresCollection.insertOne({
        nombre: autor.nombre,
        biografia: autor.biografia,
      });

      return new Response(
        JSON.stringify({
          nombre: autor.nombre,
          biografia: autor.biografia,
          id: insertedId,
        }),
      );
    }
  } else if (method === "PUT") {
    if (path === "/libro") {
      const libro = await req.json();
      if (!libro) return new Response("Bad Request", { status: 404 });

      const { modifiedCount } = await librosCollection.updateOne(
        { _id: new ObjectId(libro.Id as string) },
        {
          $set: {
            titulo: libro.titulo,
            autores: libro.autores,
            copia: libro.copia,
          },
        },
      );

      if (modifiedCount === 0) {
        return new Response("Id no existe");
      }

      return new Response("Respuesta exitosa: OK", { status: 200 });
    }
  } else if (method === "DELETE") {
    if (path === "/libro") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response("Bad Request: Id no existe", { status: 400 });
      }

      const { deletedCount } = await librosCollection.deleteOne(
        { _id: new ObjectId(id) },
      );

      if (deletedCount === 0) {
        return new Response("Libro no encontrado", { status: 404 });
      }

      return new Response("Libro eliminado exitosamente", { status: 200 });
    }
  }

  return new Response("Endpoint not found", { status: 404 });
};

Deno.serve({ port: 3000 }, handler);
