import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'http://localhost:5173/test.html';
const artifactsDir = 'C:\\Users\\exbxda13\\.gemini\\antigravity-cli\\brain\\29afe154-0445-42ac-bea1-aed928a9165c';

const runCapture = async (charType, animType, filename, waitMs) => {
  return new Promise((resolve, reject) => {
    console.log(`Capturing ${charType} (${animType})...`);
    const chromeProcess = spawn(chromePath, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--remote-debugging-port=9222',
      '--window-size=1280,720',
      'about:blank'
    ]);

    setTimeout(async () => {
      try {
        const res = await fetch('http://127.0.0.1:9222/json');
        const targets = await res.json();
        const pageTarget = targets.find(t => t.type === 'page');
        
        if (!pageTarget) {
          chromeProcess.kill();
          reject(new Error('Page target not found'));
          return;
        }

        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
          ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            const args = msg.params.args.map(arg => arg.value !== undefined ? arg.value : JSON.stringify(arg));
            console.log('[BROWSER CONSOLE]', ...args);
          }
          if (msg.id === 2) {
            ws.send(JSON.stringify({
              id: 3,
              method: 'Page.navigate',
              params: { url: targetUrl }
            }));
          } else if (msg.id === 3) {
            setTimeout(() => {
              const expr = `
                const selectChar = document.getElementById('sel-skeletal-char');
                selectChar.value = '${charType}';
                selectChar.dispatchEvent(new Event('change'));

                const selectAnim = document.getElementById('sel-skeletal-anim');
                selectAnim.value = '${animType}';
                selectAnim.dispatchEvent(new Event('change'));

                // Hide skeletal bones graphics overlay
                const chkBones = document.getElementById('chk-skeletal-bones');
                chkBones.checked = false;
                chkBones.dispatchEvent(new Event('change'));

                // Activate the skeletal rig tab
                const skeletalTabBtn = document.querySelector('[data-tab="tab-skeletal-rig"]');
                if (skeletalTabBtn) {
                  skeletalTabBtn.click();
                }

                // Hide other sections to focus close-up
                document.querySelector('.map-section').style.display = 'none';
                document.querySelector('.backgrounds-section').style.display = 'none';
                document.getElementById('diagnostic-grid').style.display = 'none';
                const sims = document.querySelectorAll('.sim-section');
                sims[0].style.display = 'none';
                sims[1].style.display = 'none';
                document.querySelector('header').style.display = 'none';
                document.body.style.background = '#07090e';
              `;
              ws.send(JSON.stringify({
                id: 4,
                method: 'Runtime.evaluate',
                params: { expression: expr }
              }));
            }, 1000);
          } else if (msg.id === 4) {
            setTimeout(() => {
              ws.send(JSON.stringify({
                id: 5,
                method: 'Page.captureScreenshot',
                params: { format: 'png' }
              }));
            }, waitMs);
          } else if (msg.id === 5) {
            if (msg.error) {
              reject(new Error(msg.error.message));
            } else {
              const imgBuffer = Buffer.from(msg.result.data, 'base64');
              const destPath = path.join(artifactsDir, filename);
              fs.writeFileSync(destPath, imgBuffer);
              console.log(`Saved screenshot to ${destPath}`);
              resolve();
            }
            ws.close();
            chromeProcess.kill();
          }
        };
      } catch (err) {
        chromeProcess.kill();
        reject(err);
      }
    }, 3000);
  });
};

const main = async () => {
  try {
    // Male Base Idle
    await runCapture('male_base', 'idle', 'test_screenshot_skeletal.png', 4000);
    // Male Base Walk
    await runCapture('male_base', 'walk', 'test_screenshot_skeletal_walk.png', 4000);
    // Male Base Attack
    await runCapture('male_base', 'attack', 'test_screenshot_skeletal_attack.png', 4000);
    // Male Base Special Action
    await runCapture('male_base', 'special', 'test_screenshot_skeletal_special.png', 4000);
    
    console.log('All profile captures done successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during capture run:', err);
    process.exit(1);
  }
};

main();
