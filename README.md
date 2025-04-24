# Lecture Notes AI

This project is a web application that allows users to upload lecture slides and converts them into clean notes using AI. The application is structured into a client-side and server-side, with a clear separation of concerns.

## Features

- Upload lecture slides in various formats.
- AI-powered conversion of slides into concise notes.
- Display of uploaded slides and generated notes.

## Project Structure

```
lecture-notes-ai
├── src
│   ├── client
│   │   ├── components
│   │   │   ├── App.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── Notes.tsx
│   │   │   └── Slides.tsx
│   │   ├── styles
│   │   │   └── index.css
│   │   └── index.tsx
│   ├── server
│   │   ├── api
│   │   │   ├── routes.ts
│   │   │   └── controllers.ts
│   │   ├── services
│   │   │   ├── aiService.ts
│   │   │   └── fileService.ts
│   │   └── index.ts
│   └── types
│       └── index.ts
├── public
│   └── index.html
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

To get started with the project, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/lecture-notes-ai.git
   ```

2. Navigate to the project directory:
   ```
   cd lecture-notes-ai
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and go to `http://localhost:3000` to access the application.

## Usage

- Use the file upload component to select and upload your lecture slides.
- The application will process the slides and generate clean notes.
- View the uploaded slides and the generated notes in the respective components.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.