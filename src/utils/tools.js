
export function toggleScrollY(status) {
    if (status) {
        document.documentElement.style.overflowY = 'auto'
        document.documentElement.style.paddingRight = ''
    } else {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        document.documentElement.style.overflowY = 'hidden'
        if (scrollbarWidth > 0 && !(window.CSS && window.CSS.supports('scrollbar-gutter: stable'))) {
            document.documentElement.style.paddingRight = scrollbarWidth + 'px'
        }
    }
}
