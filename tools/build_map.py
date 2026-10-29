"""Draw the base map for the VistaTrans locations slide.

Reads Natural Earth 1:50m GeoJSON (public domain) and writes
assets/img/locations-map.svg: the lower 48 states, Canada's provinces and
Mexico in an Albers projection, with the Great Lakes cut out. States and
provinces that hold a VistaTrans location are a shade darker. It also prints
each location's position in the map's pixel space; those go into the pins'
left/top in index.html.

    python3 tools/build_map.py <dir with the GeoJSON files>

Source files (naturalearthdata.com, via github.com/nvkelso/natural-earth-vector):
    ne_50m_admin_1_states_provinces_lakes.geojson
    ne_50m_admin_0_countries.geojson
"""
import json, math, pathlib, sys

src = pathlib.Path(sys.argv[1])
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'assets/img/locations-map.svg'

W, H = 1110, 650  # map box on the slide, in stage pixels

LOCATIONS = {  # lon, lat
    'huntley': (-88.4297, 42.1386),
    'grapevine': (-97.0720, 32.9260),
    'norcross': (-84.2135, 33.9300),
    'etobicoke': (-79.5560, 43.6160),
}
HOME = {'US-IL', 'US-TX', 'US-GA', 'CA-ON'}

# Albers equal-area conic, standard parallels for the contiguous US.
lat1, lat2, lat0, lon0 = map(math.radians, (29.5, 45.5, 37.5, -87.0))
n = (math.sin(lat1) + math.sin(lat2)) / 2
C = math.cos(lat1) ** 2 + 2 * n * math.sin(lat1)
rho0 = math.sqrt(C - 2 * n * math.sin(lat0)) / n


def albers(lon, lat):
    lon, lat = math.radians(lon), math.radians(lat)
    rho = math.sqrt(C - 2 * n * math.sin(lat)) / n
    t = n * (lon - lon0)
    return rho * math.sin(t), rho0 - rho * math.cos(t)


# Fit the central and eastern states (where all four locations are, with a
# little of Ontario above) into the box.
frame = [albers(lon, lat) for lon in range(-106, -66, 1) for lat in (25.5, 47.0)]
fx0, fx1 = min(p[0] for p in frame), max(p[0] for p in frame)
fy0, fy1 = min(p[1] for p in frame), max(p[1] for p in frame)
scale = min(W / (fx1 - fx0), H / (fy1 - fy0))
ox = W / 2 - scale * (fx0 + fx1) / 2
oy = H / 2 + scale * (fy0 + fy1) / 2


def proj(lon, lat):
    x, y = albers(lon, lat)
    return ox + scale * x, oy - scale * y


def simplify(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy) or 1e-9
    i_max, d_max = 0, -1.0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
        if d > d_max:
            i_max, d_max = i, d
    if d_max <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[: i_max + 1], tol)[:-1] + simplify(pts[i_max:], tol)


def ring_path(ring):
    pts = [proj(lon, lat) for lon, lat in ring]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    if max(xs) < -40 or min(xs) > W + 40 or max(ys) < -40 or min(ys) > H + 40:
        return ''
    # A closed ring starts and ends on the same point, so simplify it as two
    # open halves.
    mid = len(pts) // 2
    pts = simplify(pts[: mid + 1], 0.6)[:-1] + simplify(pts[mid:], 0.6)
    if len(pts) < 4:
        return ''
    return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'


def geom_path(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    return ''.join(ring_path(r) for poly in polys for r in poly)


paths = {'other': [], 'state': [], 'home': []}
for f in json.load(open(src / 'ne_50m_admin_0_countries.geojson'))['features']:
    if f['properties']['ADM0_A3'] in ('MEX', 'CUB', 'BHS'):
        if d := geom_path(f['geometry']):
            paths['other'].append(d)
for f in json.load(open(src / 'ne_50m_admin_1_states_provinces_lakes.geojson'))['features']:
    p = f['properties']
    if p['adm0_a3'] not in ('USA', 'CAN') or p['postal'] in ('AK', 'HI'):
        continue
    code = f"{p['iso_a2']}-{p['postal']}"
    if d := geom_path(f['geometry']):
        kind = 'home' if code in HOME else 'state' if p['adm0_a3'] == 'USA' else 'other'
        paths[kind].append(d)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<g fill-rule="evenodd" stroke="#fff" stroke-width="1.2" stroke-linejoin="round">
<path fill="#ebe7e3" d="{''.join(paths['other'])}"/>
<path fill="#dedad5" d="{''.join(paths['state'])}"/>
<path fill="#cbc4bd" d="{''.join(paths['home'])}"/>
</g>
</svg>
'''
out.write_text(svg)
print(f'{out} ({len(svg) / 1024:.0f} KB)')
for k, (lon, lat) in LOCATIONS.items():
    x, y = proj(lon, lat)
    print(f'{k}: left:{x:.0f}px;top:{y:.0f}px')
