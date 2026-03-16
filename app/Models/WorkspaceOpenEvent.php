<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceOpenEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'workspace_id',
        'opened_at',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
