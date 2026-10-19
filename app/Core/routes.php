<?php

declare(strict_types=1);

use App\Controllers\AboutController;
use App\Controllers\Admin\AuthController;
use App\Controllers\Admin\CertificateAdminController;
use App\Controllers\Admin\DashboardController;
use App\Controllers\Admin\DesignAdminController;
use App\Controllers\Admin\ExperienceAdminController;
use App\Controllers\Admin\MessageAdminController;
use App\Controllers\Admin\ProfileAdminController;
use App\Controllers\Admin\ProjectAdminController;
use App\Controllers\Admin\SkillAdminController;
use App\Controllers\CertificateController;
use App\Controllers\ContactController;
use App\Controllers\DesignController;
use App\Controllers\ExperienceController;
use App\Controllers\HomeController;
use App\Controllers\ProjectController;
use App\Controllers\SeoController;

/** @var \App\Core\Router $router */

$router->get('/', [HomeController::class, 'index']);
$router->get('/about', [AboutController::class, 'index']);
$router->get('/projects', [ProjectController::class, 'index']);
$router->get('/projects/{slug}', [ProjectController::class, 'show']);
$router->get('/design', [DesignController::class, 'index']);
$router->get('/certificates', [CertificateController::class, 'index']);
$router->get('/certificates/{id}', [CertificateController::class, 'show']);
$router->get('/experience', [ExperienceController::class, 'index']);
$router->get('/contact', [ContactController::class, 'show']);
$router->post('/contact', [ContactController::class, 'submit']);
$router->get('/sitemap.xml', [SeoController::class, 'sitemap']);
$router->get('/robots.txt', [SeoController::class, 'robots']);

$router->get('/admin/login', [AuthController::class, 'showLogin']);
$router->post('/admin/login', [AuthController::class, 'login']);
$router->post('/admin/logout', [AuthController::class, 'logout']);
$router->get('/admin', [DashboardController::class, 'index']);

$router->get('/admin/projects', [ProjectAdminController::class, 'index']);
$router->get('/admin/projects/create', [ProjectAdminController::class, 'create']);
$router->post('/admin/projects', [ProjectAdminController::class, 'store']);
$router->get('/admin/projects/{id}/edit', [ProjectAdminController::class, 'edit']);
$router->get('/admin/projects/{id}/delete', [ProjectAdminController::class, 'confirmDelete']);
$router->post('/admin/projects/{id}/status', [ProjectAdminController::class, 'status']);
$router->post('/admin/projects/{id}/delete', [ProjectAdminController::class, 'destroy']);
$router->post('/admin/projects/{id}', [ProjectAdminController::class, 'update']);
$router->get('/admin/projects/{id}', [ProjectAdminController::class, 'show']);

$router->get('/admin/certificates', [CertificateAdminController::class, 'index']);
$router->get('/admin/certificates/create', [CertificateAdminController::class, 'create']);
$router->post('/admin/certificates', [CertificateAdminController::class, 'store']);
$router->get('/admin/certificates/{id}/edit', [CertificateAdminController::class, 'edit']);
$router->get('/admin/certificates/{id}/delete', [CertificateAdminController::class, 'confirmDelete']);
$router->post('/admin/certificates/{id}/status', [CertificateAdminController::class, 'status']);
$router->post('/admin/certificates/{id}/delete', [CertificateAdminController::class, 'destroy']);
$router->post('/admin/certificates/{id}', [CertificateAdminController::class, 'update']);
$router->get('/admin/certificates/{id}', [CertificateAdminController::class, 'show']);

$router->get('/admin/designs', [DesignAdminController::class, 'index']);
$router->get('/admin/designs/create', [DesignAdminController::class, 'create']);
$router->post('/admin/designs', [DesignAdminController::class, 'store']);
$router->get('/admin/designs/{id}/edit', [DesignAdminController::class, 'edit']);
$router->get('/admin/designs/{id}/delete', [DesignAdminController::class, 'confirmDelete']);
$router->post('/admin/designs/{id}/status', [DesignAdminController::class, 'status']);
$router->post('/admin/designs/{id}/delete', [DesignAdminController::class, 'destroy']);
$router->post('/admin/designs/{id}', [DesignAdminController::class, 'update']);
$router->get('/admin/designs/{id}', [DesignAdminController::class, 'show']);

$router->get('/admin/skills', [SkillAdminController::class, 'index']);
$router->get('/admin/skills/create', [SkillAdminController::class, 'create']);
$router->post('/admin/skills', [SkillAdminController::class, 'store']);
$router->get('/admin/skills/{id}/edit', [SkillAdminController::class, 'edit']);
$router->get('/admin/skills/{id}/delete', [SkillAdminController::class, 'confirmDelete']);
$router->post('/admin/skills/{id}/status', [SkillAdminController::class, 'status']);
$router->post('/admin/skills/{id}/delete', [SkillAdminController::class, 'destroy']);
$router->post('/admin/skills/{id}', [SkillAdminController::class, 'update']);
$router->get('/admin/skills/{id}', [SkillAdminController::class, 'show']);

$router->get('/admin/experience', [ExperienceAdminController::class, 'index']);
$router->get('/admin/experience/create', [ExperienceAdminController::class, 'create']);
$router->post('/admin/experience', [ExperienceAdminController::class, 'store']);
$router->get('/admin/experience/{id}/edit', [ExperienceAdminController::class, 'edit']);
$router->get('/admin/experience/{id}/delete', [ExperienceAdminController::class, 'confirmDelete']);
$router->post('/admin/experience/{id}/status', [ExperienceAdminController::class, 'status']);
$router->post('/admin/experience/{id}/delete', [ExperienceAdminController::class, 'destroy']);
$router->post('/admin/experience/{id}', [ExperienceAdminController::class, 'update']);
$router->get('/admin/experience/{id}', [ExperienceAdminController::class, 'show']);

$router->get('/admin/profile', [ProfileAdminController::class, 'edit']);
$router->post('/admin/profile', [ProfileAdminController::class, 'update']);
$router->get('/admin/media', [ProfileAdminController::class, 'media']);
$router->post('/admin/media', [ProfileAdminController::class, 'updateResume']);

$router->get('/admin/messages', [MessageAdminController::class, 'index']);
$router->get('/admin/messages/{id}/delete', [MessageAdminController::class, 'confirmDelete']);
$router->post('/admin/messages/{id}/read', [MessageAdminController::class, 'read']);
$router->post('/admin/messages/{id}/delete', [MessageAdminController::class, 'destroy']);
$router->get('/admin/messages/{id}', [MessageAdminController::class, 'show']);
