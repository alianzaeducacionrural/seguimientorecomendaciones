// ─────────────────────────────────────────────────────────────
// Seguimiento a Recomendaciones — Comité Académico
// Backend Apps Script: Sheets como base de datos, Web App como API JSON.
// ─────────────────────────────────────────────────────────────

const HOJAS = {
  RECOMENDACIONES: 'recomendaciones',
  DESTINATARIOS: 'destinatarios',
  ASIGNACIONES: 'asignaciones',
  EVIDENCIAS: 'evidencias',
};

const ENCABEZADOS = {
  [HOJAS.RECOMENDACIONES]: ['id', 'codigo', 'recomendacion', 'tipo', 'hallazgo', 'prioridad', 'evidencia_esperada', 'fecha_inicio', 'fecha_estimada', 'creado_en', 'actualizado_en'],
  [HOJAS.DESTINATARIOS]: ['id', 'tipo', 'nombre', 'municipio', 'correo', 'token', 'activo'],
  [HOJAS.ASIGNACIONES]: ['id', 'recomendacion_id', 'destinatario_id', 'estado', 'porcentaje', 'tipo_ajuste', 'descripcion_ajuste', 'impacto', 'observaciones', 'fecha_reporte', 'actualizado_en'],
  [HOJAS.EVIDENCIAS]: ['id', 'asignacion_id', 'tipo', 'titulo', 'url', 'drive_file_id', 'fecha'],
};

// action= / entidad= admitidos por el router genérico (listar / crear / editar / eliminar)
const ENTIDADES_CRUD = {
  recomendaciones: HOJAS.RECOMENDACIONES,
  destinatarios: HOJAS.DESTINATARIOS,
  asignaciones: HOJAS.ASIGNACIONES,
  evidencias: HOJAS.EVIDENCIAS,
};

// Catálogo externo (solo lectura, no se duplica hasta sembrarDestinatarios).
const CATALOGO_EXTERNO = {
  SHEET_ID: '1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog',
  GID_INSTITUCIONES: 28982679, // pestaña "Instituciones": Municipio | Institución Educativa
};

const CARPETA_RAIZ_DRIVE = '1Jyoqe-gmOlT2rOVm1cdTHnq2Vq7LEjA5';

const ENTIDADES_SEMILLA = ['Comité de Cafeteros de Caldas', 'Secretaría de Educación de Manizales (SEM)'];

const ZONA_HORARIA = 'America/Bogota';

// ─────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL — Router HTTP
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if (action === 'ping') return responder({ ok: true, mensaje: 'hola mundo' });
    if (action === 'catalogoDestinatarios') return responder({ ok: true, ...getCatalogoExterno() });
    if (action === 'portal') return responder(getPortal(e.parameter.token));
    if (ENTIDADES_CRUD[action]) {
      return responder({ ok: true, datos: listarFilas(ENTIDADES_CRUD[action]) });
    }
    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    // e.postData.contents decodifica los bytes como Latin-1: los acentos y la
    // ñ llegan corruptos si no se relee explícitamente como UTF-8.
    const body = JSON.parse(e.postData.getDataAsString('UTF-8'));
    if (body.accion === 'crear') return responder(crearRegistro(body.entidad, body.datos || {}));
    if (body.accion === 'editar') return responder(editarRegistro(body.entidad, body.id, body.datos || {}));
    if (body.accion === 'eliminar') return responder(eliminarRegistro(body.entidad, body.id));
    if (body.accion === 'asignar') return responder(asignarDestinatarios(body.recomendacion_id, body.destinatario_ids || []));
    if (body.accion === 'reportarAvance') return responder(reportarAvance(body.token, body.asignacion_id, body));
    if (body.accion === 'subirEvidencia') return responder(subirEvidencia(body.token, body.asignacion_id, body));
    if (body.accion === 'sembrarDestinatarios') return responder(sembrarDestinatarios());
    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function responder(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────
// ACCESO A HOJAS — esquema autorreparable
// ─────────────────────────────────────────────────────────────

function hojaDe(nombreHoja) {
  const ss = SpreadsheetApp.getActive();
  let hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    hoja.setFrozenRows(1);
  }
  asegurarEsquema(hoja, ENCABEZADOS[nombreHoja]);
  return hoja;
}

function asegurarEsquema(hoja, encabezados) {
  if (hoja.getMaxColumns() < encabezados.length) {
    hoja.insertColumnsAfter(hoja.getMaxColumns(), encabezados.length - hoja.getMaxColumns());
  }
  const actuales = hoja.getRange(1, 1, 1, encabezados.length).getValues()[0];
  if (encabezados.some((campo, i) => String(actuales[i]).trim() !== campo)) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  }
}

function listarFilas(nombreHoja) {
  const hoja = hojaDe(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return [];
  const valores = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  return valores
    .filter((fila) => fila[0] !== '' && fila[0] !== null)
    .map((fila) => {
      const obj = {};
      encabezados.forEach((campo, i) => { obj[campo] = fila[i] instanceof Date ? formatearFechaISO(fila[i]) : fila[i]; });
      return obj;
    });
}

function filaPorId(hoja, encabezados, id) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return -1;
  const ids = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // fila real en la hoja
  }
  return -1;
}

function siguienteId(hoja) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return 1;
  const ids = hoja.getRange(2, 1, ultimaFila - 1, 1).getValues().flat().map(Number).filter((n) => !isNaN(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function hoy() {
  return Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
}

function formatearFechaISO(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM-dd');
}

// ─────────────────────────────────────────────────────────────
// CRUD GENÉRICO
// ─────────────────────────────────────────────────────────────

function crearRegistro(entidad, datos) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no reconocida' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = hojaDe(nombreHoja);
    const encabezados = ENCABEZADOS[nombreHoja];
    const registro = Object.assign({}, datos, { id: siguienteId(hoja) });

    if (nombreHoja === HOJAS.RECOMENDACIONES) {
      registro.codigo = generarCodigoRecomendacion(hoja);
      registro.creado_en = hoy();
      registro.actualizado_en = hoy();
    }
    if (nombreHoja === HOJAS.DESTINATARIOS) {
      registro.token = generarToken(tokensExistentes(hoja));
      if (registro.activo === undefined) registro.activo = true;
    }

    const fila = encabezados.map((campo) => registro[campo] ?? '');
    hoja.appendRow(fila);
    return { ok: true, id: registro.id };
  } finally {
    lock.releaseLock();
  }
}

function editarRegistro(entidad, id, datos) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no reconocida' };

  const hoja = hojaDe(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const filaIndex = filaPorId(hoja, encabezados, id);
  if (filaIndex === -1) return { ok: false, error: 'Registro no encontrado' };

  if (nombreHoja === HOJAS.RECOMENDACIONES) datos.actualizado_en = hoy();

  Object.keys(datos).forEach((campo) => {
    const colIndex = encabezados.indexOf(campo);
    if (colIndex === -1) return;
    hoja.getRange(filaIndex, colIndex + 1).setValue(datos[campo]);
  });
  return { ok: true };
}

function eliminarRegistro(entidad, id) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no reconocida' };

  const hoja = hojaDe(nombreHoja);
  const filaIndex = filaPorId(hoja, ENCABEZADOS[nombreHoja], id);
  if (filaIndex === -1) return { ok: false, error: 'Registro no encontrado' };
  hoja.deleteRow(filaIndex);

  // Al eliminar una recomendación se pierden también sus asignaciones y evidencias asociadas.
  if (nombreHoja === HOJAS.RECOMENDACIONES) {
    const hojaAsig = hojaDe(HOJAS.ASIGNACIONES);
    const asignaciones = listarFilas(HOJAS.ASIGNACIONES).filter((a) => String(a.recomendacion_id) === String(id));
    asignaciones.forEach((a) => eliminarRegistro('asignaciones', a.id));
  }
  if (nombreHoja === HOJAS.ASIGNACIONES) {
    const evidencias = listarFilas(HOJAS.EVIDENCIAS).filter((ev) => String(ev.asignacion_id) === String(id));
    evidencias.forEach((ev) => eliminarRegistro('evidencias', ev.id));
  }
  return { ok: true };
}

function generarCodigoRecomendacion(hoja) {
  const anio = new Date().getFullYear();
  const prefijo = `REC-${anio}-`;
  const ultimaFila = hoja.getLastRow();
  let maxN = 0;
  if (ultimaFila >= 2) {
    const codigos = hoja.getRange(2, 2, ultimaFila - 1, 1).getValues().flat();
    codigos.forEach((c) => {
      if (String(c).startsWith(prefijo)) {
        const n = parseInt(String(c).slice(prefijo.length), 10);
        if (!isNaN(n) && n > maxN) maxN = n;
      }
    });
  }
  return prefijo + String(maxN + 1).padStart(3, '0');
}

function tokensExistentes(hoja) {
  const ultimaFila = hoja.getLastRow();
  const colToken = ENCABEZADOS[HOJAS.DESTINATARIOS].indexOf('token') + 1;
  if (ultimaFila < 2) return new Set();
  return new Set(hoja.getRange(2, colToken, ultimaFila - 1, 1).getValues().flat().filter(Boolean));
}

function generarToken(existentes) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token;
  do {
    token = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (existentes.has(token));
  existentes.add(token);
  return token;
}

// ─────────────────────────────────────────────────────────────
// ASIGNACIÓN DE DESTINATARIOS
// ─────────────────────────────────────────────────────────────

function asignarDestinatarios(recomendacionId, destinatarioIds) {
  if (!recomendacionId || !Array.isArray(destinatarioIds)) return { ok: false, error: 'Parámetros inválidos' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = hojaDe(HOJAS.ASIGNACIONES);
    const existentes = listarFilas(HOJAS.ASIGNACIONES).filter((a) => String(a.recomendacion_id) === String(recomendacionId));
    const yaAsignados = new Set(existentes.map((a) => String(a.destinatario_id)));

    let siguiente = siguienteId(hoja);
    const filas = [];
    destinatarioIds.forEach((destId) => {
      if (yaAsignados.has(String(destId))) return;
      filas.push([
        siguiente, recomendacionId, destId, 'No iniciada', 0, '', '', '', '', '', hoy(),
      ]);
      siguiente++;
    });

    if (filas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, ENCABEZADOS[HOJAS.ASIGNACIONES].length).setValues(filas);
    }
    return { ok: true, creadas: filas.length };
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────
// MAGIC LINKS — PORTAL DEL DESTINATARIO
// ─────────────────────────────────────────────────────────────

function destinatarioPorToken(token) {
  if (!token) return null;
  return listarFilas(HOJAS.DESTINATARIOS).find((d) => String(d.token).trim() === String(token).trim()) || null;
}

function getPortal(token) {
  const destinatario = destinatarioPorToken(token);
  if (!destinatario) return { ok: false, error: 'Token inválido' };

  const recomendaciones = listarFilas(HOJAS.RECOMENDACIONES);
  const mapaRec = new Map(recomendaciones.map((r) => [String(r.id), r]));
  const evidencias = listarFilas(HOJAS.EVIDENCIAS);

  const asignaciones = listarFilas(HOJAS.ASIGNACIONES)
    .filter((a) => String(a.destinatario_id) === String(destinatario.id))
    .map((a) => ({
      ...a,
      recomendacion: mapaRec.get(String(a.recomendacion_id)) || null,
      evidencias: evidencias.filter((ev) => String(ev.asignacion_id) === String(a.id)),
    }))
    .filter((a) => a.recomendacion);

  return {
    ok: true,
    destinatario: { id: destinatario.id, nombre: destinatario.nombre, tipo: destinatario.tipo, municipio: destinatario.municipio },
    asignaciones,
  };
}

function reportarAvance(token, asignacionId, campos) {
  const destinatario = destinatarioPorToken(token);
  if (!destinatario) return { ok: false, error: 'Token inválido' };

  const hoja = hojaDe(HOJAS.ASIGNACIONES);
  const encabezados = ENCABEZADOS[HOJAS.ASIGNACIONES];
  const filaIndex = filaPorId(hoja, encabezados, asignacionId);
  if (filaIndex === -1) return { ok: false, error: 'Asignación no encontrada' };

  const destIdCol = encabezados.indexOf('destinatario_id') + 1;
  const destIdActual = hoja.getRange(filaIndex, destIdCol).getValue();
  if (String(destIdActual) !== String(destinatario.id)) {
    return { ok: false, error: 'No autorizado para modificar esta asignación' };
  }

  const actualizacion = {
    estado: campos.estado,
    porcentaje: Number(campos.porcentaje) || 0,
    tipo_ajuste: campos.tipo_ajuste || '',
    descripcion_ajuste: campos.descripcion_ajuste || '',
    impacto: campos.impacto || '',
    observaciones: campos.observaciones || '',
    fecha_reporte: hoy(),
    actualizado_en: hoy(),
  };
  Object.keys(actualizacion).forEach((campo) => {
    const colIndex = encabezados.indexOf(campo);
    if (colIndex === -1) return;
    hoja.getRange(filaIndex, colIndex + 1).setValue(actualizacion[campo]);
  });
  return { ok: true };
}

function subirEvidencia(token, asignacionId, payload) {
  const destinatario = destinatarioPorToken(token);
  if (!destinatario) return { ok: false, error: 'Token inválido' };

  const asignacion = listarFilas(HOJAS.ASIGNACIONES).find((a) => String(a.id) === String(asignacionId));
  if (!asignacion) return { ok: false, error: 'Asignación no encontrada' };
  if (String(asignacion.destinatario_id) !== String(destinatario.id)) {
    return { ok: false, error: 'No autorizado para modificar esta asignación' };
  }

  const hoja = hojaDe(HOJAS.EVIDENCIAS);
  const registro = { id: siguienteId(hoja), asignacion_id: asignacionId, fecha: hoy() };

  if (payload.tipo === 'archivo') {
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, payload.nombre);
    const archivo = getCarpetaEvidencias().createFile(blob);
    registro.tipo = 'archivo';
    registro.titulo = payload.nombre || archivo.getName();
    registro.url = archivo.getUrl();
    registro.drive_file_id = archivo.getId();
  } else {
    if (!payload.url) return { ok: false, error: 'Falta el enlace de evidencia' };
    registro.tipo = 'enlace';
    registro.titulo = payload.titulo || 'Evidencia';
    registro.url = payload.url;
    registro.drive_file_id = '';
  }

  const fila = ENCABEZADOS[HOJAS.EVIDENCIAS].map((campo) => registro[campo] ?? '');
  hoja.appendRow(fila);
  return { ok: true, id: registro.id };
}

function getCarpetaEvidencias() {
  const raiz = DriveApp.getFolderById(CARPETA_RAIZ_DRIVE);
  const it = raiz.getFoldersByName('Evidencias');
  return it.hasNext() ? it.next() : raiz.createFolder('Evidencias');
}

// ─────────────────────────────────────────────────────────────
// CATÁLOGO EXTERNO — instituciones y universidades (solo lectura)
// ─────────────────────────────────────────────────────────────

function getCatalogoExterno() {
  const ss = SpreadsheetApp.openById(CATALOGO_EXTERNO.SHEET_ID);

  const hojaInst = ss.getSheets().find((h) => h.getSheetId() === CATALOGO_EXTERNO.GID_INSTITUCIONES);
  const instituciones = [];
  if (hojaInst) {
    const filas = hojaInst.getDataRange().getValues();
    for (let i = 1; i < filas.length; i++) {
      const municipio = String(filas[i][0] || '').trim();
      const nombre = String(filas[i][1] || '').trim();
      if (municipio && nombre) instituciones.push({ municipio, nombre });
    }
  }

  // La pestaña de universidades se localiza por encabezado ("Universidad" /
  // "Programa"), no por gid ni por nombre: así no se rompe si la renombran.
  const universidades = [];
  const vistos = new Set();
  ss.getSheets().forEach((hoja) => {
    const filas = hoja.getDataRange().getValues();
    if (!filas.length) return;
    const encabezado = filas[0].map((c) => String(c).trim().toLowerCase());
    const colU = encabezado.indexOf('universidad');
    if (colU === -1) return;
    for (let i = 1; i < filas.length; i++) {
      const nombre = String(filas[i][colU] || '').trim();
      if (nombre && !vistos.has(nombre)) {
        vistos.add(nombre);
        universidades.push({ nombre });
      }
    }
  });

  return { instituciones, universidades };
}

function sembrarDestinatarios() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hoja = hojaDe(HOJAS.DESTINATARIOS);
    const existentes = listarFilas(HOJAS.DESTINATARIOS);
    const clavesExistentes = new Set(existentes.map((d) => `${d.tipo}|${d.nombre}|${d.municipio || ''}`));
    const tokens = tokensExistentes(hoja);
    const catalogo = getCatalogoExterno();

    const candidatos = [];
    catalogo.instituciones.forEach((inst) => {
      candidatos.push({ tipo: 'institucion_educativa', nombre: inst.nombre, municipio: inst.municipio, correo: '', activo: true });
    });
    catalogo.universidades.forEach((uni) => {
      candidatos.push({ tipo: 'universidad', nombre: uni.nombre, municipio: '', correo: '', activo: true });
    });
    ENTIDADES_SEMILLA.forEach((nombre) => {
      candidatos.push({ tipo: 'entidad', nombre, municipio: '', correo: '', activo: true });
    });

    let siguiente = siguienteId(hoja);
    const filasNuevas = [];
    candidatos.forEach((c) => {
      const clave = `${c.tipo}|${c.nombre}|${c.municipio || ''}`;
      if (clavesExistentes.has(clave)) return;
      clavesExistentes.add(clave);
      const registro = Object.assign({}, c, { id: siguiente, token: generarToken(tokens) });
      filasNuevas.push(ENCABEZADOS[HOJAS.DESTINATARIOS].map((campo) => registro[campo] ?? ''));
      siguiente++;
    });

    if (filasNuevas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, filasNuevas.length, ENCABEZADOS[HOJAS.DESTINATARIOS].length).setValues(filasNuevas);
    }
    return { ok: true, creados: filasNuevas.length, total: existentes.length + filasNuevas.length };
  } finally {
    lock.releaseLock();
  }
}
