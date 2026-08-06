// tailwind.config.js
export default {
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			info: 'hsl(var(--info))',
  			success: 'hsl(var(--success))',
  			warning: 'hsl(var(--warning))',
  			terra: {
  				DEFAULT: 'rgb(var(--terra-rgb) / <alpha-value>)',
  				light: 'var(--terra-light)',
  				dark: 'var(--terra-dark)'
  			},
  			cream: {
  				DEFAULT: 'var(--cream)',
  				alt: 'var(--cream-alt)'
  			},
  			surface: {
  				DEFAULT: 'var(--surface)',
  				alt: 'var(--surface-alt)'
  			},
  			ink: {
  				DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
  				warm: 'rgb(var(--ink-warm-rgb) / <alpha-value>)',
  				muted: 'var(--muted-warm)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		backgroundImage: {
  			'app-gradient': 'var(--gradient-app)',
  			'brand-gradient': 'var(--gradient-brand)'
  		},
  		fontFamily: {
  			figtree: [
  				'Figtree',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			thinking: {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			}
  		},
  		animation: {
  			thinking: 'thinking 3s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
