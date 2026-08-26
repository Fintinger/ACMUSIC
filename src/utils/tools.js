
export function toggleScrollY(status) {
    if (status) {
        document.documentElement.style.overflowY = 'auto'
        document.documentElement.style.paddingRight = ''
    } else {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        document.documentElement.style.overflowY = 'hidden'
        if (scrollbarWidth > 0) {
            document.documentElement.style.paddingRight = scrollbarWidth + 'px'
        }
    }
}