import { Collection } from "mongodb";
import { Autor, AutorModel, Libro, LibroModel } from "./types.ts";

// de model a Libro
export const fromModelToLibro = async (
    model: LibroModel,
    autorCollection: Collection<AutorModel>,
): Promise<Libro> => {
    const autores = await autorCollection.find(
        { _id: { $in: model.autores } },
    ).toArray();

    return ({
        id: model._id!.toString(),
        titulo: model.titulo,
        autores: autores.map((a) => fromModelToAutor(a)),
        copias: model.copias,
    });
};

// de model a Autor
export const fromModelToAutor = (model: AutorModel): Autor => ({
    id: model._id!.toString(),
    nombre: model.nombre,
    biografia: model.biografia,
});
