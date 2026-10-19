<?php
/** @var string $path */
/** @var array $paging */
/** @var array $query */
$page = (int) $paging['page'];
$previous = $query;
$previous['page'] = (string) ($page - 1);
$next = $query;
$next['page'] = (string) ($page + 1);
?>
<nav class="pager" aria-label="Pages">
    <?php if ($page > 1): ?>
        <a href="<?= e(query_url($path, $previous)) ?>">Previous</a>
    <?php endif; ?>
    <span>Page <?= e((string) $page) ?> of <?= e((string) $paging['total_pages']) ?></span>
    <?php if ($page < (int) $paging['total_pages']): ?>
        <a href="<?= e(query_url($path, $next)) ?>">Next</a>
    <?php endif; ?>
</nav>
