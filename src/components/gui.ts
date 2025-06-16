interface UISettings {
    color: string
    subdivisions: number
    spin: () => void
    ambientLightColor: string
    meshLinesScaleFactor: number
    meshPointsScaleFactor: number
}

export const settings: UISettings = {
    color: '#008000',
    ambientLightColor: '#008000',
    subdivisions: 1,
    spin: () => {},
    meshLinesScaleFactor: 1,
    meshPointsScaleFactor: 1,
}