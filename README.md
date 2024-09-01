# Squirrels Testing UI

This project is the source code for the Testing UI for the squirrels project when running the API server. It is built using NodeJS, Typescript, and React.

## License

Squirrels Testing UI is released under the MIT license.

See the file LICENSE for more details.

## Contributing 

The sections below decribe how to set up your local environment for development of this project.

### Setup

Install NodeJS v20.10.0 or higher. Then run `npm install` on this project.

For testing, we recommend using an existing Squirrels project, and run its API server (by running "sqrl run" in the project). See "index.html" for the expected hostname and port that the Squirrels project is running on. 

Then run `npm run dev` in this project to activate the client. Access the testing UI at http://localhost:5173/.

### Updating Squirrels Source

In the Squirrels source project, the CSS and Javascript files for the Squirrels Testing UI can be found in `squirrels/package_data/assets/`.

Compile this project into pure HTML/CSS/Javascript by running `npm run build`. You can then find the compiled files in the `dist/assets/` folder. Replace the CSS and Javascript files in the squirrels source project. DO NOT overwrite the HTML file. The updated Testing UI will then be available when activating the squirrels API server with "squirrels run".

The HTML file used by the Squirrels source project can be found at `squirrels/package_data/templates/index.html`. The file refers to the compiled Javascript and CSS files as "/assets/index.js?version=..." and "/assets/index.css?version=...". It is recommended to change the version number after "version=" to match the version number of the upcoming Squirrels version. This is because web browsers may cache the Javascript and CSS files for Squirrels developers.
