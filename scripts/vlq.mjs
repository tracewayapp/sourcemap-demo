const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeSegment(seg) {
  const vals = [];
  let shift = 0;
  let cur = 0;
  for (const c of seg) {
    const d = ALPHA.indexOf(c);
    cur |= (d & 31) << shift;
    if (d & 32) {
      shift += 5;
    } else {
      vals.push(cur & 1 ? -(cur >>> 1) : cur >>> 1);
      cur = 0;
      shift = 0;
    }
  }
  return vals;
}

export function decodeMappings(map) {
  const rows = [];
  let genLine = 0;
  let src = 0;
  let line = 0;
  let col = 0;
  let name = 0;
  for (const group of map.mappings.split(";")) {
    let genCol = 0;
    for (const seg of group.split(",")) {
      if (!seg) continue;
      const v = decodeSegment(seg);
      genCol += v[0];
      if (v.length >= 4) {
        src += v[1];
        line += v[2];
        col += v[3];
        let n = "";
        if (v.length > 4) {
          name += v[4];
          n = map.names[name];
        }
        rows.push({ genLine, genCol, source: map.sources[src], line, col, name: n });
      }
    }
    genLine++;
  }
  return rows;
}

export function floorLookup(rows, genLine, genCol) {
  let best = null;
  for (const r of rows) {
    if (r.genLine !== genLine) continue;
    if (r.genCol > genCol) break;
    best = r;
  }
  return best;
}
