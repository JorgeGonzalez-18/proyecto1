const paginate = async (model, queryParams, config = {}) => {
  const {
    allowedSort = ["createdAt"],
    defaultSort = { createdAt: -1 },
    searchFields = [],
    baseFilter = {},
    populate = null,
  } = config;

  let { page = 1, limit = 10, sort, search } = queryParams;

  // 1. Validar page
  page = Number(page);
  if (!Number.isInteger(page) || page < 1) {
    const error = new Error(
      "El parametro page debe ser un entero mayor o igual a 1",
    );
    error.status = 400;
    throw error;
  }

  // 2. Validar limit
  limit = Number(limit);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
    const error = new Error(
      "El parametro limit debe ser un entero entre 1 y 50",
    );
    error.status = 400;
    throw error;
  }

  // 3. Validar y construir sort
  let sortObject = defaultSort;
  if (sort) {
    const isDesc = sort.startsWith("-");
    const sortField = isDesc ? sort.substring(1) : sort;

    if (!allowedSort.includes(sortField)) {
      const error = new Error(
        `Campo de ordenamiento no permitido: ${sortField}`,
      );
      error.status = 400;
      throw error;
    }

    sortObject = { [sortField]: isDesc ? -1 : 1 };
  }

  // 4. Construir filtros finales combinando baseFilter y busqueda
  const filter = { ...baseFilter };

  if (search && search.trim() !== "" && searchFields.length > 0) {
    const regex = new RegExp(search.trim(), "i");
    if (searchFields.length === 1) {
      filter[searchFields[0]] = regex;
    } else {
      filter.$or = searchFields.map((field) => ({ [field]: regex }));
    }
  }

  // 5. Contar total filtrado y calcular paginas
  const total = await model.countDocuments(filter);
  const pages = Math.ceil(total / limit);

  // 6. Ejecutar consulta con paginacion
  let query = model
    .find(filter)
    .sort(sortObject)
    .skip((page - 1) * limit)
    .limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  const data = await query.exec();

  return {
    data,
    page,
    limit,
    total,
    pages,
  };
};

module.exports = { paginate };
