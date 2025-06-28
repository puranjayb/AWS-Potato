// lib/toast.ts
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  type: ToastType
  message: string
  duration?: number
}

class ToastManager {
  private container: HTMLElement | null = null

  private getContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2'
      document.body.appendChild(this.container)
    }
    return this.container
  }

  private show({ type, message, duration = 4000 }: ToastOptions) {
    const container = this.getContainer()
    
    const toast = document.createElement('div')
    toast.className = `
      px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0
      ${type === 'success' ? 'bg-green-600 text-white' : ''}
      ${type === 'error' ? 'bg-red-600 text-white' : ''}
      ${type === 'info' ? 'bg-blue-600 text-white' : ''}
      ${type === 'warning' ? 'bg-yellow-600 text-white' : ''}
    `
    toast.textContent = message
    
    container.appendChild(toast)
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0')
    }, 10)
    
    // Auto remove
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast)
        }
      }, 300)
    }, duration)
  }

  success(message: string, duration?: number) {
    this.show({ type: 'success', message, duration })
  }

  error(message: string, duration?: number) {
    this.show({ type: 'error', message, duration })
  }

  info(message: string, duration?: number) {
    this.show({ type: 'info', message, duration })
  }

  warning(message: string, duration?: number) {
    this.show({ type: 'warning', message, duration })
  }
}

export const toast = new ToastManager()