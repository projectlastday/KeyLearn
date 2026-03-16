<?php

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '081234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('phone.verify.notice'));
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'phone' => '+6281234567890',
    ]);
});

test('new users can register without otp when phone verification is disabled', function () {
    config()->set('auth.phone_verification.enabled', false);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '081234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect('/workspaces');
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'phone' => '+6281234567890',
        'phone_verification_required' => false,
    ]);
});
