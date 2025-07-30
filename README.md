# React + Vite
- http://localhost:5173/
- node version: node v20.19.0

## UI stack:
- Tailwind
- ShadCN UI

## File structure:
src/
├── assets/                # Static assets like images, icons, fonts
├── components/            # Reusable UI components (buttons, inputs, modals)
│   ├── chat/              # Chat-related components (e.g., StoryPromptChat)
│   ├── uploader/          # Image upload + sequencing components
│   ├── video/             # Video preview, length selector, model selector
│   ├── ui/                # Generic UI building blocks (e.g., Button, Modal, FlexBox)
│   └── ...                # Other reusable component groups
├── hooks/                 # Custom React hooks (e.g., useChat, useUploader)
├── layouts/               # Layout components (page wrappers, navigation bars)
├── pages/                 # Top-level page components (routes)
│   ├── Home.jsx
│   ├── Creator.jsx         # Main Creator flow (story + images + video)
│   └── ...                
├── stores/                # State management (Zustand/Jotai stores or Contexts)
├── services/              # API calls, AI model integration, helpers
├── styles/                # Global styles, Tailwind config overrides if needed
├── utils/                 # Utility functions/helpers
└── App.jsx                # Root app component and routing