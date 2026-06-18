// Pure layout math for the dashboard grid — a hand-rolled port of the collision/compaction approach
// react-grid-layout uses, kept dependency-free so it runs on React 19 (which removed findDOMNode that
// react-grid-layout/react-draggable relied on). Widgets are { key, x, y, w, h } in grid units on a
// COLS-wide grid; the grid compacts vertically (items float up to fill space, x is preserved).

export const COLS = 24

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

export const cloneLayout = (layout) => layout.map((l) => ({ ...l }))

export function bottom(layout) {
    let max = 0
    for (const l of layout) max = Math.max(max, l.y + l.h)
    return max
}

export function collides(a, b) {
    if (a.key === b.key) return false
    if (a.x + a.w <= b.x) return false
    if (a.x >= b.x + b.w) return false
    if (a.y + a.h <= b.y) return false
    if (a.y >= b.y + b.h) return false
    return true
}

export function getAllCollisions(layout, item) {
    return layout.filter((l) => collides(l, item))
}

export function getFirstCollision(layout, item) {
    for (const l of layout) if (collides(l, item)) return l
    return undefined
}

// Top-left first: by row, then column.
function sortLayoutItems(layout) {
    return layout.slice().sort((a, b) => {
        if (a.y > b.y || (a.y === b.y && a.x > b.x)) return 1
        if (a.y === b.y && a.x === b.x) return 0
        return -1
    })
}

const xOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x

// Float every item up to the lowest gap it fits into without overlapping an already-placed item.
// Candidate positions are 0 and the bottom edge of every item it overlaps horizontally, so it works
// for fractional sizes too (no fixed row step) and leaves no gap below a shorter widget. Returns a
// fresh, collision-free layout.
export function compact(layout, cols = COLS) {
    const placed = []
    const sorted = sortLayoutItems(layout)
    const out = new Array(layout.length)
    for (let i = 0; i < sorted.length; i++) {
        const l = { ...sorted[i] }
        l.x = clamp(l.x, 0, cols - l.w)
        const candidates = [0]
        for (const p of placed) if (xOverlap(p, l)) candidates.push(p.y + p.h)
        candidates.sort((a, b) => a - b)
        l.y = candidates[candidates.length - 1]
        for (const y of candidates) {
            if (!getFirstCollision(placed, { ...l, y })) {
                l.y = y
                break
            }
        }
        l.moved = false
        placed.push(l)
        out[layout.indexOf(sorted[i])] = l
    }
    return out
}

// Push every item colliding with `item` down to just below it, cascading recursively. `moved` guards
// against revisiting an item within a single pass.
function pushDownCollisions(layout, item) {
    for (const c of getAllCollisions(layout, item)) {
        if (c.key === item.key || c.moved) continue
        c.moved = true
        c.y = item.y + item.h
        pushDownCollisions(layout, c)
    }
}

function prepare(base) {
    const layout = cloneLayout(base)
    for (const i of layout) i.moved = false
    return layout
}

/** Move `key` to grid cell (x, y), pushing colliders out of the way, then compact. */
export function layoutMove(base, key, x, y, cols = COLS) {
    const layout = prepare(base)
    const item = layout.find((i) => i.key === key)
    if (!item) return base
    item.x = clamp(x, 0, cols - item.w)
    item.y = Math.max(0, y)
    item.moved = true
    pushDownCollisions(layout, item)
    return compact(layout, cols)
}

/** Resize `key` to w×h grid units, pushing colliders out of the way, then compact. */
export function layoutResize(base, key, w, h, cols = COLS) {
    const layout = prepare(base)
    const item = layout.find((i) => i.key === key)
    if (!item) return base
    item.w = clamp(w, 1, cols)
    if (item.x + item.w > cols) item.x = Math.max(0, cols - item.w)
    item.h = Math.max(1, h)
    item.moved = true
    pushDownCollisions(layout, item)
    return compact(layout, cols)
}

export const sameLayout = (a, b) =>
    a.length === b.length &&
    a.every((l) => {
        const m = b.find((i) => i.key === l.key)
        return m && m.x === l.x && m.y === l.y && m.w === l.w && m.h === l.h
    })
