import {sendData} from './api.js';
import {showSuccess, showError} from './message.js';
import {initEffects, resetEffects} from './effects.js';
import {initScale} from './scale.js';

const form = document.querySelector('.img-upload__form');
const uploadInput = form.querySelector('.img-upload__input');
const overlay = form.querySelector('.img-upload__overlay');
const cancelButton = form.querySelector('.img-upload__cancel');
const hashtagInput = form.querySelector('.text__hashtags');
const commentInput = form.querySelector('.text__description');
const submitButton = form.querySelector('.img-upload__submit');
const previewImage = form.querySelector('.img-upload__preview img');

const HASHTAG_REGEX = /^#[a-zа-яё0-9]{1,19}$/i;
const MAX_HASHTAGS = 5;
const MAX_COMMENT_LENGTH = 140;
const FILE_TYPES = ['jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const pristine = new Pristine(form, {
  classTo: 'img-upload__field-wrapper',
  errorTextParent: 'img-upload__field-wrapper',
  errorTextClass: 'img-upload__error-text',
});

const validateHashtags = (value) => {
  if (!value) {
    return true;
  }

  const hashtags = value.trim().toLowerCase().split(' ');

  if (hashtags.length > MAX_HASHTAGS) {
    return false;
  }

  const uniqueHashtags = new Set(hashtags);
  if (uniqueHashtags.size !== hashtags.length) {
    return false;
  }

  return hashtags.every((hashtag) => HASHTAG_REGEX.test(hashtag));
};

const validateComment = (value) => !value || value.length <= MAX_COMMENT_LENGTH;

pristine.addValidator(
  hashtagInput,
  validateHashtags,
  'Неправильный формат хэштегов'
);

pristine.addValidator(
  commentInput,
  validateComment,
  `Комментарий не может быть длиннее ${MAX_COMMENT_LENGTH} символов`
);

function onEscKeydown(evt) {
  if (evt.key === 'Escape' && document.activeElement !== hashtagInput && document.activeElement !== commentInput) {
    evt.preventDefault();
    hideForm();
  }
}

function hideForm() {
  form.reset();
  pristine.reset();
  resetEffects();
  overlay.classList.add('hidden');
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', onEscKeydown);
  // Очищаем URL объект
  if (previewImage.dataset.currentUrl) {
    URL.revokeObjectURL(previewImage.dataset.currentUrl);
    previewImage.dataset.currentUrl = '';
  }
  previewImage.src = '';
}

function showForm() {
  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onEscKeydown);
}

const toggleSubmitButton = (disabled) => {
  submitButton.disabled = disabled;
  submitButton.textContent = disabled ? 'Публикация...' : 'Опубликовать';
};

const onImageLoad = () => {
  showForm();
};

const onImageError = () => {
  hideForm();
  showError('Не удалось загрузить изображение');
  uploadInput.value = '';
};

const initForm = () => {
  initEffects();
  initScale();
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showError('Размер файла не должен превышать 5MB');
        uploadInput.value = '';
        return;
      }

      const fileName = file.name.toLowerCase();
      const matches = FILE_TYPES.some((it) => fileName.endsWith(it));

      if (!matches) {
        showError('Загрузите изображение в формате jpg, jpeg или png');
        uploadInput.value = '';
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      previewImage.src = imageUrl;
      // Сохраняем URL для последующей очистки
      previewImage.dataset.currentUrl = imageUrl;

      // Добавляем обработчики загрузки изображения
      previewImage.addEventListener('load', onImageLoad, { once: true });
      previewImage.addEventListener('error', onImageError, { once: true });
    }
  });

  cancelButton.addEventListener('click', () => {
    hideForm();
  });

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    if (!pristine.validate()) {
      return;
    }

    try {
      toggleSubmitButton(true);
      await sendData(new FormData(evt.target));
      hideForm();
      showSuccess();
    } catch {
      showError();
    } finally {
      toggleSubmitButton(false);
    }
  });
};

export {initForm};
