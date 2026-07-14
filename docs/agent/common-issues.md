# Common Issues

| Issue                                                     | Solution                                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| JavaScript heap out of memory during the standalone build | Run `NODE_OPTIONS=--max-old-space-size=16384 npm run build:standalone`.                 |
| Dev server does not start on `5173`                       | Vite will pick another port; use the printed `standalone.html` URL instead.             |
