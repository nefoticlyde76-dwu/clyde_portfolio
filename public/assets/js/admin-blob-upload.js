import { upload } from '@vercel/blob/client';

const forms = document.querySelectorAll('form.admin-form');

for (const form of forms) {
    form.addEventListener('submit', async (event) => {
        const selectedInputs = Array.from(form.querySelectorAll('input[type="file"][data-blob-token]'))
            .filter((input) => input instanceof HTMLInputElement && input.files?.length);

        if (form.dataset.blobUploading === 'true') {
            event.preventDefault();
            return;
        }
        if (selectedInputs.length === 0) {
            return;
        }

        event.preventDefault();
        form.dataset.blobUploading = 'true';
        const status = document.createElement('p');
        status.className = 'field-help';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        form.prepend(status);

        try {
            for (const input of selectedInputs) {
                const file = input.files[0];
                status.textContent = `Uploading ${file.name}...`;
                const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/\.\./g, '_').slice(-80) || 'upload';
                const pathname = `uploads/${input.dataset.blobFolder}/${crypto.randomUUID()}-${safeName}`;
                const blob = await upload(pathname, file, {
                    access: 'public',
                    handleUploadUrl: input.dataset.blobEndpoint,
                    clientPayload: input.dataset.blobToken,
                });

                const hiddenName = `${input.name}_blob_url`;
                let hidden = form.querySelector(`input[type="hidden"][name="${hiddenName}"]`);
                if (!(hidden instanceof HTMLInputElement)) {
                    hidden = document.createElement('input');
                    hidden.type = 'hidden';
                    hidden.name = hiddenName;
                    form.append(hidden);
                }
                hidden.value = blob.url;
                input.value = '';
            }

            status.textContent = 'Upload complete. Saving...';
            HTMLFormElement.prototype.submit.call(form);
        } catch (error) {
            status.setAttribute('role', 'alert');
            status.textContent = error instanceof Error ? error.message : 'The file could not be uploaded.';
            form.dataset.blobUploading = 'false';
        }
    });
}
