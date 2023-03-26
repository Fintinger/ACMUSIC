
export function toggleScrollY(status) {
    if (status) {
        document.documentElement.style.overflowY = 'auto'
    } else {
        document.documentElement.style.overflowY = 'hidden'
    }
}