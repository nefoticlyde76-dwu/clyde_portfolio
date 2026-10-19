<?php
/** @var string $name */
/** @var string $type */
/** @var string $label */
/** @var string $value */
/** @var string $error */
/** @var string $help */
/** @var bool $required */
/** @var array $options */
/** @var string $accept */
/** @var string $preview */
/** @var string $previewLabel */
/** @var bool $checked */
/** @var int $max */
$id = 'field-' . preg_replace('/[^a-z0-9_-]/i', '', $name);
$errorId = $id . '-error';
$helpId = $id . '-help';
$described = [];
if ($help !== '') {
    $described[] = $helpId;
}
if ($error !== '') {
    $described[] = $errorId;
}
$describedBy = $described === [] ? '' : ' aria-describedby="' . e(implode(' ', $described)) . '"';
$invalid = $error !== '' ? ' aria-invalid="true"' : '';
$requiredAttr = $required ? ' required' : '';
$maxAttr = $max > 0 ? ' maxlength="' . $max . '"' : '';
?>
<div class="field<?= $error !== '' ? ' has-error' : '' ?>">
    <?php if ($type === 'checkbox'): ?>
        <label class="check" for="<?= e($id) ?>">
            <input id="<?= e($id) ?>" type="checkbox" name="<?= e($name) ?>" value="1"<?= $checked ? ' checked' : '' ?><?= $describedBy ?><?= $invalid ?>>
            <span><?= e($label) ?></span>
        </label>
    <?php else: ?>
        <label for="<?= e($id) ?>"><?= e($label) ?></label>
        <?php if ($type === 'textarea'): ?>
            <textarea id="<?= e($id) ?>" name="<?= e($name) ?>" rows="5"<?= $requiredAttr ?><?= $maxAttr ?><?= $describedBy ?><?= $invalid ?>><?= e($value) ?></textarea>
        <?php elseif ($type === 'select'): ?>
            <select id="<?= e($id) ?>" name="<?= e($name) ?>"<?= $requiredAttr ?><?= $describedBy ?><?= $invalid ?>>
                <?php foreach ($options as $optionValue => $optionLabel): ?>
                    <option value="<?= e((string) $optionValue) ?>"<?= (string) $optionValue === $value ? ' selected' : '' ?>><?= e((string) $optionLabel) ?></option>
                <?php endforeach; ?>
            </select>
        <?php elseif ($type === 'file'): ?>
            <?php if ($preview !== ''): ?>
                <p class="file-preview">
                    <?php if (preg_match('/\.(jpe?g|png|gif|webp)$/i', (string) parse_url($preview, PHP_URL_PATH))): ?>
                        <img src="<?= e($preview) ?>" alt="">
                    <?php endif; ?>
                    <a href="<?= e($preview) ?>" rel="noopener noreferrer"><?= e($previewLabel) ?></a>
                </p>
            <?php endif; ?>
            <input id="<?= e($id) ?>" type="file" name="<?= e($name) ?>"<?= $accept !== '' ? ' accept="' . e($accept) . '"' : '' ?><?= $describedBy ?><?= $invalid ?>>
        <?php else: ?>
            <input id="<?= e($id) ?>" type="<?= e($type) ?>" name="<?= e($name) ?>" value="<?= e($value) ?>"<?= $requiredAttr ?><?= $maxAttr ?><?= $describedBy ?><?= $invalid ?>>
        <?php endif; ?>
    <?php endif; ?>
    <?php if ($help !== ''): ?>
        <p class="field-help" id="<?= e($helpId) ?>"><?= e($help) ?></p>
    <?php endif; ?>
    <?php if ($error !== ''): ?>
        <p class="field-error" id="<?= e($errorId) ?>" role="alert"><span class="state-label">Error.</span> <?= e($error) ?></p>
    <?php endif; ?>
</div>
