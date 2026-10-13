import { initialWindowMetrics } from 'react-native-safe-area-context'

// Where screen content starts. A fixed number cannot do this job: the top
// inset is 20 on an SE, 47 from the iPhone X through the 14, and 59 on a
// 14 Pro and later, so any single value is wrong on most devices.
const TOP_INSET = initialWindowMetrics?.insets?.top ?? 47

// BackButton is absolutely positioned at TOP_INSET + 8 and stands about
// 37pt tall, ending at TOP_INSET + 45. Starting content at + 56 leaves the
// same ~11pt gap iOS puts between a 44pt navigation bar and the view under
// it. Content used to start at a flat 72, which on this phone sits 33pt
// above where the back control ends — hence the overlap.
export const CONTENT_TOP = TOP_INSET + 56

// Screens with no back control have nothing to clear, so the larger value
// would just open an empty band across the top.
export const SCREEN_TOP = TOP_INSET + 16
