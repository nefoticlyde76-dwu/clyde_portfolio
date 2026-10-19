<section class="admin-guest-card">
    <p class="eyebrow">Private</p>
    <h1>Sign in</h1>
    <p class="lede">This account is created from the command line. There is no public registration.</p>
    <form class="stack-form" method="post" action="<?= e(url('/admin/login')) ?>">
        <?= csrf_field() ?>
        <label for="email">Username</label>
        <input id="email" name="email" type="text" autocomplete="username" required maxlength="190" spellcheck="false">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit" class="btn btn-slate">Sign in</button>
    </form>
</section>
