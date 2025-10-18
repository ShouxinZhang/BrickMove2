export function enableDragAndDrop(input) {
  if (!input) {
    return;
  }

  const label = input.nextElementSibling;
  if (!label) {
    return;
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    label.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    label.addEventListener(eventName, () => {
      label.style.background = '#f59e0b';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    label.addEventListener(eventName, () => {
      label.style.background = '';
    }, false);
  });

  label.addEventListener('drop', event => {
    const { files } = event.dataTransfer;
    if (files && files.length > 0) {
      input.files = files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}
