(() => {
    let dialog_resolver = null;

    function get_dialog_parts() {
        const existing_modal = get_element('app-dialog-modal');

        if (existing_modal) {
            return {
                modal: existing_modal,
                title: get_element('app-dialog-title'),
                message: get_element('app-dialog-message'),
                confirm_button: get_element('app-dialog-confirm'),
                cancel_button: get_element('app-dialog-cancel')
            };
        }

        document.body.insertAdjacentHTML(
            'beforeend',
            `
                <div id="app-dialog-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2 id="app-dialog-title">แจ้งเตือน</h2>
                        <p id="app-dialog-message" class="dialog-message"></p>
                        <div class="modal-actions dialog-actions">
                            <button type="button" id="app-dialog-cancel" class="btn secondary" style="display: none;">ยกเลิก</button>
                            <button type="button" id="app-dialog-confirm" class="btn primary">ตกลง</button>
                        </div>
                    </div>
                </div>
            `
        );

        const dialog_parts = {
            modal: get_element('app-dialog-modal'),
            title: get_element('app-dialog-title'),
            message: get_element('app-dialog-message'),
            confirm_button: get_element('app-dialog-confirm'),
            cancel_button: get_element('app-dialog-cancel')
        };

        dialog_parts.confirm_button.addEventListener('click', () => close_dialog(true));
        dialog_parts.cancel_button.addEventListener('click', () => close_dialog(false));
        dialog_parts.modal.addEventListener('click', (click_event) => {
            if (click_event.target === dialog_parts.modal) {
                close_dialog(false);
            }
        });

        document.addEventListener('keydown', (keyboard_event) => {
            if (dialog_parts.modal.style.display !== 'flex') {
                return;
            }

            if (keyboard_event.key === 'Escape') {
                keyboard_event.preventDefault();
                close_dialog(false);
            }

            if (keyboard_event.key === 'Enter') {
                keyboard_event.preventDefault();
                close_dialog(true);
            }
        });

        return dialog_parts;
    }

    function close_dialog(result) {
        const dialog_parts = get_dialog_parts();
        dialog_parts.modal.style.display = 'none';

        if (!dialog_resolver) {
            return;
        }

        const current_resolver = dialog_resolver;
        dialog_resolver = null;
        current_resolver(result);
    }

    function show_dialog({
        title = 'แจ้งเตือน',
        message = '',
        confirm_text = 'ตกลง',
        cancel_text = ''
    }) {
        const dialog_parts = get_dialog_parts();

        dialog_parts.title.textContent = title;
        dialog_parts.message.textContent = String(message || '');
        dialog_parts.confirm_button.textContent = confirm_text;
        dialog_parts.cancel_button.textContent = cancel_text || 'ยกเลิก';
        dialog_parts.cancel_button.style.display = cancel_text ? 'inline-flex' : 'none';
        dialog_parts.modal.style.display = 'flex';

        return new Promise((resolve) => {
            dialog_resolver = resolve;
            dialog_parts.confirm_button.focus();
        });
    }

    window.show_alert = (message, title = 'แจ้งเตือน') =>
        show_dialog({ title, message, confirm_text: 'ตกลง' });

    window.show_confirm = (message, title = 'ยืนยัน') =>
        show_dialog({ title, message, confirm_text: 'ตกลง', cancel_text: 'ยกเลิก' });

    window.alert = (message) => {
        void window.show_alert(message);
    };
})();
