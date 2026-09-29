/**
 * The rules the demo's Adminium plays, as `manifest.json` declares them.
 * Written by `npm run demo-rules`; do not edit by hand.
 */
// prettier-ignore
export const MANIFEST_RULES = {
  "stamps": {
    "events": {
      "published_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "published"
          ]
        }
      },
      "postponed_at": {
        "set": "now",
        "on": {
          "column": "was_starts_at",
          "filled": true
        }
      },
      "cancelled_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "cancelled"
          ]
        }
      }
    },
    "customers": {
      "created_at": {
        "set": "now",
        "on": "create"
      }
    },
    "orders": {
      "held_until": {
        "set": {
          "addMinutes": {
            "minutes": {
              "table": "settings",
              "column": "hold_minutes"
            }
          }
        },
        "on": {
          "columns": [
            "status"
          ]
        }
      },
      "offer_until": {
        "set": {
          "addMinutes": {
            "hours": {
              "table": "settings",
              "column": "offer_hours"
            },
            "notAfter": {
              "column": "doors_at",
              "via": "event_id"
            }
          }
        },
        "on": {
          "column": "status",
          "values": [
            "offered"
          ]
        }
      },
      "pay_by": {
        "set": {
          "deadline": {
            "days": {
              "table": "settings",
              "column": "transfer_days"
            },
            "time": {
              "table": "settings",
              "column": "transfer_time"
            },
            "notAfter": {
              "column": "doors_at",
              "via": "event_id",
              "minus": {
                "days": {
                  "table": "settings",
                  "column": "transfer_cutoff_days"
                }
              }
            }
          }
        },
        "on": {
          "column": "status",
          "values": [
            "awaiting_transfer"
          ]
        }
      },
      "eve_at": {
        "set": {
          "moment": {
            "column": "doors_at",
            "minus": {
              "days": 1
            }
          }
        },
        "on": {
          "columns": [
            "doors_at"
          ]
        }
      },
      "created_at": {
        "set": "now",
        "on": "create"
      },
      "confirmed_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "door",
            "no_charge",
            "awaiting_transfer",
            "paid"
          ]
        }
      },
      "door_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "door"
          ]
        }
      },
      "paid_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "paid"
          ]
        }
      },
      "released_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "released"
          ]
        }
      },
      "cancelled_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "cancelled"
          ]
        }
      }
    },
    "tickets": {
      "eve_at": {
        "set": {
          "moment": {
            "column": "doors_at",
            "minus": {
              "days": 1
            }
          }
        },
        "on": {
          "columns": [
            "doors_at"
          ]
        }
      },
      "holder_email": {
        "set": {
          "copy": "pending_email"
        },
        "on": {
          "columns": [
            "holder_customer_id"
          ]
        }
      },
      "offer_until": {
        "set": {
          "addMinutes": {
            "hours": {
              "table": "settings",
              "column": "send_hours"
            },
            "notAfter": {
              "column": "doors_at",
              "via": "event_id"
            }
          }
        },
        "on": {
          "column": "status",
          "values": [
            "offered"
          ]
        }
      },
      "sent_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "offered"
          ]
        }
      },
      "accepted_at": {
        "set": "now",
        "on": {
          "column": "holder_customer_id",
          "filled": true
        }
      },
      "refund_asked_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "refund_asked"
          ]
        }
      },
      "cancelled_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "cancelled"
          ]
        }
      }
    },
    "check_ins": {
      "scanned_at": {
        "set": "now",
        "on": "create"
      },
      "scanned_by": {
        "set": "user-name",
        "on": "create"
      }
    },
    "door_collections": {
      "taken_at": {
        "set": "now",
        "on": "create"
      },
      "taken_by": {
        "set": "user-name",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "state",
          "values": [
            "voided"
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "state",
          "values": [
            "voided"
          ]
        }
      }
    },
    "payments": {
      "recorded_at": {
        "set": "now",
        "on": "create"
      },
      "recorded_by": {
        "set": "user-name",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      }
    },
    "refunds": {
      "recorded_at": {
        "set": "now",
        "on": "create"
      },
      "recorded_by": {
        "set": "user-name",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      }
    },
    "guest_list": {
      "in_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "in"
          ]
        }
      },
      "in_by": {
        "set": "user-name",
        "on": {
          "column": "status",
          "values": [
            "in"
          ]
        }
      },
      "added_by": {
        "set": "user-name",
        "on": "create"
      }
    },
    "waitlist": {
      "joined_at": {
        "set": "now",
        "on": "create"
      },
      "offered_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "offered"
          ]
        }
      },
      "offer_until": {
        "set": {
          "addMinutes": {
            "hours": {
              "table": "settings",
              "column": "offer_hours"
            },
            "notAfter": {
              "column": "doors_at",
              "via": "event_id"
            }
          }
        },
        "on": {
          "column": "status",
          "values": [
            "offered"
          ]
        }
      }
    },
    "reminders": {
      "created_at": {
        "set": "now",
        "on": "create"
      }
    },
    "broadcasts": {
      "sent_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "sent"
          ]
        }
      },
      "sent_by": {
        "set": "user-name",
        "on": {
          "column": "status",
          "values": [
            "sent"
          ]
        }
      }
    },
    "messages": {
      "created_at": {
        "set": "now",
        "on": "create"
      }
    }
  },
  "renewals": {
    "tickets": {
      "code": {
        "column": "holder_customer_id",
        "changed": true
      },
      "link_token": {
        "column": "pending_email",
        "changed": true
      }
    }
  },
  "enums": {
    "settings": {
      "default_age": [
        "16",
        "18",
        "all",
        "14_adult"
      ]
    },
    "rooms": {
      "kind": [
        "room",
        "both"
      ]
    },
    "events": {
      "kind": [
        "gig",
        "club",
        "comedy",
        "talks",
        "festival"
      ],
      "age": [
        "16",
        "18",
        "all",
        "14_adult"
      ],
      "status": [
        "draft",
        "published",
        "cancelled"
      ]
    },
    "event_days": {
      "event_status": [
        "draft",
        "published",
        "cancelled"
      ]
    },
    "acts": {
      "event_status": [
        "draft",
        "published",
        "cancelled"
      ]
    },
    "ticket_types": {
      "event_status": [
        "draft",
        "published",
        "cancelled"
      ],
      "kind": [
        "standard",
        "early",
        "balcony",
        "pass",
        "day",
        "place",
        "presale",
        "register",
        "comp",
        "other"
      ],
      "visibility": [
        "public",
        "code",
        "box"
      ]
    },
    "codes": {
      "kind": [
        "percent",
        "amount",
        "unlock"
      ],
      "type_kind": [
        "standard",
        "early",
        "balcony",
        "pass",
        "day",
        "place",
        "presale"
      ]
    },
    "customers": {},
    "questions": {
      "event_status": [
        "draft",
        "published",
        "cancelled"
      ],
      "kind": [
        "text",
        "choice",
        "yes_no"
      ],
      "per": [
        "ticket",
        "order"
      ]
    },
    "orders": {
      "status": [
        "held",
        "confirming",
        "offered",
        "door",
        "awaiting_transfer",
        "overdue",
        "released",
        "no_charge",
        "paid",
        "not_collected",
        "let_go",
        "expired",
        "cancelled"
      ],
      "channel": [
        "online",
        "box_office",
        "door"
      ],
      "code_kind": [
        "percent",
        "amount",
        "unlock"
      ],
      "code_type_kind": [
        "standard",
        "early",
        "balcony",
        "pass",
        "day",
        "place",
        "presale"
      ],
      "cancel_cause": [
        "show",
        "box_office",
        "request",
        "buyer",
        "claim",
        "waitlist_ended"
      ],
      "paid_method": [
        "bank_transfer",
        "card",
        "cash"
      ]
    },
    "tickets": {
      "status": [
        "valid",
        "offered",
        "refund_asked",
        "returned",
        "released",
        "cancelled"
      ],
      "order_status": [
        "held",
        "confirming",
        "offered",
        "door",
        "awaiting_transfer",
        "overdue",
        "released",
        "no_charge",
        "paid",
        "not_collected",
        "let_go",
        "expired",
        "cancelled"
      ],
      "order_cancel_cause": [
        "show",
        "box_office",
        "request",
        "buyer",
        "claim",
        "waitlist_ended"
      ],
      "kind": [
        "standard",
        "early",
        "balcony",
        "pass",
        "day",
        "place",
        "presale",
        "register",
        "comp",
        "other"
      ],
      "code_kind": [
        "percent",
        "amount",
        "unlock"
      ],
      "code_type_kind": [
        "standard",
        "early",
        "balcony",
        "pass",
        "day",
        "place",
        "presale"
      ],
      "cancel_cause": [
        "show",
        "box_office",
        "request",
        "buyer",
        "claim",
        "waitlist_ended"
      ]
    },
    "check_ins": {
      "status": [
        "in"
      ]
    },
    "door_collections": {
      "method": [
        "card",
        "cash"
      ],
      "state": [
        "taken",
        "voided"
      ]
    },
    "payments": {
      "method": [
        "bank_transfer",
        "card",
        "cash"
      ]
    },
    "refunds": {
      "kind": [
        "cancelled_tickets",
        "goodwill"
      ],
      "method": [
        "bank_transfer",
        "card",
        "cash"
      ]
    },
    "guest_list": {
      "status": [
        "not_in",
        "in"
      ]
    },
    "waitlist": {
      "status": [
        "waiting",
        "offered",
        "claimed",
        "missed",
        "left",
        "removed"
      ]
    },
    "reminders": {},
    "broadcasts": {
      "audience": [
        "everyone",
        "type",
        "not_in"
      ],
      "template": [
        "set_times",
        "doors",
        "moved",
        "cancelled",
        "other"
      ],
      "status": [
        "waiting",
        "sent"
      ]
    },
    "messages": {
      "kind": [
        "tickets",
        "tickets-paid",
        "transfer-confirm",
        "transfer-confirm-offer",
        "transfer-waiting",
        "transfer-reminder",
        "transfer-released",
        "payment-received",
        "friend-offer",
        "friend-ready",
        "friend-returned",
        "holder-set",
        "waitlist-offer",
        "on-sale",
        "on-sale-presale",
        "moved",
        "cancelled-paid",
        "cancelled-unpaid",
        "moved-holder",
        "cancelled-holder",
        "tonight",
        "tomorrow",
        "tonight-holder",
        "tomorrow-holder",
        "refund-recorded",
        "tickets-cancelled",
        "refund-declined",
        "broadcast",
        "broadcast-holder"
      ],
      "status": [
        "queued",
        "held",
        "sent",
        "failed",
        "skipped"
      ],
      "skip_reason": [
        "overtaken",
        "paid",
        "void",
        "no-longer-needed",
        "by-hand"
      ]
    },
    "devices": {}
  },
  "uniques": {
    "events": [
      [
        "slug"
      ]
    ],
    "event_days": [
      [
        "event_id",
        "day"
      ]
    ],
    "codes": [
      [
        "code"
      ]
    ],
    "customers": [
      [
        "email"
      ]
    ],
    "orders": [
      [
        "number"
      ],
      [
        "client_key"
      ]
    ],
    "check_ins": [
      [
        "ticket_id",
        "event_day_id"
      ]
    ],
    "waitlist": [
      [
        "event_id",
        "email"
      ]
    ],
    "reminders": [
      [
        "event_id",
        "email",
        "target"
      ]
    ]
  },
  "capacity": {
    "orders": {
      "kind": "parent",
      "via": "code_id",
      "size": {
        "column": "max_uses"
      },
      "window": {
        "closes": "valid_until"
      },
      "countWhere": {
        "column": "status",
        "values": [
          "held",
          "confirming",
          "offered",
          "door",
          "awaiting_transfer",
          "overdue",
          "no_charge",
          "paid"
        ]
      },
      "hold": {
        "column": "held_until",
        "states": [
          "held",
          "confirming"
        ]
      }
    },
    "tickets": {
      "kind": "parent",
      "via": "ticket_type_id",
      "size": {
        "column": "capacity"
      },
      "window": {
        "opens": "sales_start",
        "closes": "sales_end"
      },
      "perWrite": {
        "max": {
          "column": "max_per_order"
        },
        "within": "order_id"
      },
      "also": [
        {
          "via": "event_id",
          "size": {
            "column": "sell_limit"
          }
        }
      ],
      "lockBy": "event_id",
      "countWhere": [
        {
          "column": "status",
          "values": [
            "valid",
            "offered",
            "refund_asked",
            "returned"
          ]
        },
        {
          "via": "order_id",
          "column": "status",
          "values": [
            "held",
            "confirming",
            "offered",
            "door",
            "awaiting_transfer",
            "overdue",
            "no_charge",
            "paid"
          ]
        }
      ],
      "hold": {
        "via": "order_id",
        "states": [
          "held",
          "confirming",
          "offered"
        ],
        "column": {
          "column": "offer_until",
          "via": "waitlist_id",
          "or": [
            {
              "column": "held_until"
            }
          ]
        }
      },
      "reserved": {
        "states": [
          "returned"
        ]
      }
    },
    "door_collections": {
      "kind": "parent",
      "via": "ticket_id",
      "size": 1,
      "countWhere": {
        "column": "state",
        "values": [
          "taken"
        ]
      }
    },
    "guest_list": {
      "kind": "parent",
      "via": "event_id",
      "size": {
        "column": "guest_places"
      },
      "amount": "people"
    }
  },
  "states": {
    "events": {
      "column": "status",
      "initial": "draft",
      "moves": {
        "draft": [
          "published"
        ],
        "published": [
          "cancelled",
          "draft"
        ]
      }
    },
    "orders": {
      "column": "status",
      "initial": "held",
      "strict": true,
      "moves": {
        "held": [
          {
            "to": "door",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "door_on",
                  "eq": true
                }
              ],
              "where": [
                {
                  "column": "no_door",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "confirming",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "transfer_on",
                  "eq": true
                }
              ],
              "time": {
                "before": {
                  "column": "doors_at",
                  "minus": {
                    "days": {
                      "table": "settings",
                      "column": "transfer_cutoff_days"
                    }
                  }
                }
              },
              "where": [
                {
                  "column": "no_transfer",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "no_charge",
            "requires": {
              "where": [
                {
                  "column": "total",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "awaiting_transfer",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "transfer_on",
                  "eq": true
                }
              ],
              "time": {
                "before": {
                  "column": "doors_at",
                  "minus": {
                    "days": {
                      "table": "settings",
                      "column": "transfer_cutoff_days"
                    }
                  }
                }
              },
              "where": [
                {
                  "column": "email",
                  "isNull": false
                },
                {
                  "column": "no_transfer",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          },
          "offered",
          "let_go",
          "expired",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "confirming": [
          "awaiting_transfer",
          {
            "to": "door",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "door_on",
                  "eq": true
                }
              ],
              "where": [
                {
                  "column": "no_door",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "no_charge",
            "requires": {
              "where": [
                {
                  "column": "total",
                  "lte": 0
                }
              ]
            }
          },
          "let_go",
          "expired",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "offered": [
          {
            "to": "door",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "door_on",
                  "eq": true
                }
              ],
              "where": [
                {
                  "column": "no_door",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "confirming",
            "requires": {
              "setting": [
                {
                  "table": "settings",
                  "column": "transfer_on",
                  "eq": true
                }
              ],
              "time": {
                "before": {
                  "column": "doors_at",
                  "minus": {
                    "days": {
                      "table": "settings",
                      "column": "transfer_cutoff_days"
                    }
                  }
                }
              },
              "where": [
                {
                  "column": "no_transfer",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "no_charge",
            "requires": {
              "where": [
                {
                  "column": "total",
                  "lte": 0
                }
              ]
            }
          },
          "expired",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "door": [
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "not_collected",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "gt": 0
                }
              ]
            }
          },
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "awaiting_transfer": [
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          },
          "overdue",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "overdue": [
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          },
          "released",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "released": [
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          }
        ],
        "no_charge": [
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "paid": [
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "not_collected": [
          {
            "to": "paid",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          }
        ]
      },
      "timed": [
        {
          "from": "held",
          "to": "expired",
          "at": {
            "column": "held_until"
          }
        },
        {
          "from": "confirming",
          "to": "expired",
          "at": {
            "column": "offer_until",
            "or": [
              {
                "column": "held_until"
              }
            ]
          }
        },
        {
          "from": "offered",
          "to": "expired",
          "at": {
            "column": "offer_until"
          }
        },
        {
          "from": "awaiting_transfer",
          "to": "overdue",
          "at": {
            "column": "pay_by"
          }
        },
        {
          "from": "overdue",
          "to": "released",
          "at": {
            "column": "pay_by",
            "plus": {
              "hours": {
                "table": "settings",
                "column": "release_after_hours"
              }
            }
          }
        },
        {
          "from": "door",
          "to": "not_collected",
          "at": {
            "column": "ends_at"
          }
        }
      ],
      "create": {
        "requires": {
          "linked": [
            {
              "via": "event_id",
              "where": [
                {
                  "column": "status",
                  "eq": "published"
                }
              ]
            }
          ],
          "time": {
            "before": {
              "column": "ends_at",
              "via": "event_id",
              "or": [
                {
                  "column": "curfew_at",
                  "via": "event_id"
                }
              ]
            }
          }
        }
      },
      "effects": [
        {
          "on": {
            "to": "door"
          },
          "via": "waitlist_id",
          "set": {
            "status": "claimed"
          }
        },
        {
          "on": {
            "to": "confirming"
          },
          "via": "waitlist_id",
          "set": {
            "status": "claimed"
          }
        },
        {
          "on": {
            "to": "no_charge"
          },
          "via": "waitlist_id",
          "set": {
            "status": "claimed"
          }
        },
        {
          "on": {
            "to": "expired"
          },
          "via": "waitlist_id",
          "set": {
            "status": "missed"
          }
        }
      ]
    },
    "tickets": {
      "column": "status",
      "initial": "valid",
      "strict": true,
      "moves": {
        "valid": [
          "offered",
          {
            "to": "refund_asked",
            "requires": {
              "where": [
                {
                  "column": "order_status",
                  "eq": "paid"
                }
              ],
              "time": {
                "before": {
                  "column": "refund_until",
                  "via": "event_id"
                }
              }
            }
          },
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          },
          "returned"
        ],
        "offered": [
          "valid",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          }
        ],
        "refund_asked": [
          "valid",
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_cause",
                  "isNull": false
                }
              ]
            }
          },
          "returned"
        ],
        "returned": [
          "released"
        ]
      },
      "timed": [
        {
          "from": "offered",
          "to": "valid",
          "at": {
            "column": "offer_until"
          },
          "set": {
            "pending_email": null,
            "lapsed": true
          }
        },
        {
          "from": "returned",
          "to": "released",
          "at": {
            "column": "doors_at"
          }
        }
      ],
      "create": {
        "requires": {
          "linked": [
            {
              "via": "ticket_type_id",
              "where": [
                {
                  "column": "selling",
                  "eq": true
                },
                {
                  "column": "event_status",
                  "eq": "published"
                }
              ]
            }
          ]
        }
      }
    },
    "check_ins": {
      "column": "status",
      "initial": "in",
      "moves": {},
      "create": {
        "requires": {
          "where": [
            {
              "column": "right_show",
              "eq": 1
            },
            {
              "column": "admitted",
              "eq": 1
            }
          ],
          "linked": [
            {
              "via": "ticket_id",
              "where": [
                {
                  "column": "status",
                  "in": [
                    "valid",
                    "offered"
                  ]
                },
                {
                  "column": "settled",
                  "eq": 1
                }
              ]
            }
          ],
          "time": {
            "after": {
              "column": "doors_at",
              "via": "event_day_id",
              "minus": {
                "minutes": {
                  "table": "settings",
                  "column": "check_in_minutes"
                }
              }
            },
            "before": {
              "column": "last_entry_at",
              "via": "event_day_id",
              "or": [
                {
                  "column": "curfew_at",
                  "via": "event_day_id"
                }
              ]
            }
          }
        }
      }
    },
    "guest_list": {
      "column": "status",
      "initial": "not_in",
      "strict": true,
      "moves": {
        "not_in": [
          "in"
        ],
        "in": [
          "not_in"
        ]
      }
    },
    "waitlist": {
      "column": "status",
      "initial": "waiting",
      "strict": true,
      "moves": {
        "waiting": [
          "offered",
          "left",
          "removed"
        ],
        "offered": [
          "claimed",
          "missed"
        ],
        "claimed": [
          "missed"
        ]
      }
    }
  },
  "publicAccess": [
    {
      "table": "customers",
      "methods": [
        "GET",
        "PATCH"
      ],
      "select": [
        "name",
        "email",
        "opt_in"
      ],
      "writable": [
        "name",
        "opt_in"
      ],
      "claim": {
        "verify": "email-link",
        "email": "email"
      },
      "humanCheck": true,
      "forget": {
        "columns": [
          "email",
          "name",
          "opt_in"
        ],
        "stamp": "forgotten_at",
        "links": true
      }
    },
    {
      "table": "orders",
      "methods": [
        "GET",
        "PATCH"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "customer_id"
      },
      "select": [
        "id",
        "number",
        "status",
        "event_id",
        "buyer_name",
        "email",
        "language",
        "code_text",
        "code_kind",
        "code_value",
        "code_type_kind",
        "subtotal",
        "discount",
        "adjusted",
        "total",
        "ticket_count",
        "collected",
        "paid_in",
        "refunded",
        "balance",
        "held_until",
        "offer_until",
        "pay_by",
        "created_at",
        "paid_at",
        "paid_method",
        "cancelled_at",
        "opt_in",
        "kept_at"
      ],
      "writable": [
        "status",
        "buyer_name",
        "opt_in",
        "answers",
        "access_note",
        "language",
        "kept_at"
      ],
      "writableValues": {
        "status": [
          "confirming",
          "door",
          "no_charge",
          "let_go"
        ]
      },
      "writableWhen": {
        "status": [
          "held",
          "confirming",
          "offered",
          "door",
          "awaiting_transfer",
          "overdue",
          "no_charge",
          "paid",
          "not_collected"
        ]
      },
      "documents": [
        "receipt"
      ]
    },
    {
      "table": "tickets",
      "methods": [
        "GET",
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status",
        "pending_email",
        "pending_name"
      ],
      "writableValues": {
        "status": [
          "offered",
          "valid",
          "refund_asked"
        ]
      },
      "writableWhen": {
        "status": [
          "valid",
          "offered",
          "refund_asked"
        ],
        "holder_customer_id": [
          null
        ],
        "order_status": [
          "door",
          "no_charge",
          "paid"
        ]
      },
      "limits": {
        "perValue": {
          "columns": [
            "pending_email"
          ],
          "n": 5
        },
        "plainText": [
          "pending_name"
        ]
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "holder_name",
        "answers"
      ],
      "writableWhen": {
        "status": [
          "valid",
          "offered",
          "refund_asked"
        ],
        "holder_customer_id": [
          null
        ],
        "order_status": [
          "held",
          "confirming",
          "offered",
          "door",
          "no_charge",
          "paid",
          "awaiting_transfer",
          "overdue"
        ]
      },
      "limits": {
        "plainText": [
          "holder_name"
        ]
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status",
        "cancel_cause"
      ],
      "writableValues": {
        "status": [
          "returned"
        ],
        "cancel_cause": [
          "buyer"
        ]
      },
      "writableWhen": {
        "status": [
          "valid"
        ],
        "order_status": [
          "offered",
          "door"
        ],
        "holder_customer_id": [
          null
        ],
        "collected": [
          null,
          0
        ],
        "times_in": [
          null,
          0
        ],
        "waitlist_on": [
          true
        ],
        "event_id": {
          "before": {
            "column": "doors_at"
          }
        }
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status"
      ],
      "writableValues": {
        "status": [
          "cancelled"
        ]
      },
      "defaults": {
        "cancel_cause": "buyer"
      },
      "writableWhen": {
        "status": [
          "valid"
        ],
        "order_status": [
          "door"
        ],
        "holder_customer_id": [
          null
        ],
        "collected": [
          null,
          0
        ],
        "times_in": [
          null,
          0
        ],
        "waitlist_on": [
          false
        ],
        "event_id": {
          "before": {
            "column": "doors_at"
          }
        }
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "holder_customer_id"
      },
      "select": [
        "id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "due",
        "collected",
        "code",
        "holder_name",
        "admits_day1",
        "admits_day2",
        "admits_day3"
      ]
    },
    {
      "table": "waitlist",
      "methods": [
        "GET",
        "PATCH"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "customer_id"
      },
      "select": [
        "id",
        "event_id",
        "qty",
        "status",
        "order_id",
        "offer_until"
      ],
      "writable": [
        "status"
      ],
      "writableValues": {
        "status": [
          "left"
        ]
      },
      "writableWhen": {
        "status": [
          "waiting"
        ]
      }
    },
    {
      "table": "reminders",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "customer_id"
      },
      "select": [
        "id",
        "event_id",
        "ticket_type_id",
        "target"
      ]
    },
    {
      "table": "settings",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "select": [
        "bank_account_name",
        "bank_name",
        "bank_account_number",
        "bank_routing"
      ]
    },
    {
      "table": "settings",
      "methods": [
        "GET"
      ],
      "select": [
        "venue_name",
        "address",
        "contact_email",
        "day_starts_at",
        "door_on",
        "transfer_on",
        "transfer_days",
        "transfer_time",
        "transfer_cutoff_days",
        "release_after_hours",
        "hold_minutes",
        "offer_hours",
        "send_hours",
        "refund_days",
        "refund_payback_text",
        "accounts_on",
        "waitlist_on",
        "send_on",
        "codes_on",
        "timetable_on",
        "questions_on",
        "getting_there",
        "accessibility",
        "policies",
        "faq",
        "remind_lead_hours"
      ]
    },
    {
      "table": "rooms",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "name",
        "kind",
        "note",
        "access_text",
        "position"
      ]
    },
    {
      "table": "events",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "slug",
        "name",
        "short_name",
        "support",
        "kind",
        "room_id",
        "doors_at",
        "starts_at",
        "curfew_at",
        "ends_at",
        "age",
        "age_note",
        "about",
        "image",
        "poster_style",
        "poster_hue",
        "on_sale_at",
        "refund_until",
        "refund_text",
        "bags",
        "re_entry",
        "waitlist_on",
        "sets_published",
        "guest_places",
        "status",
        "published_at",
        "was_starts_at",
        "postponed_at",
        "cancelled_at",
        "code_types"
      ],
      "filters": [
        {
          "column": "status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ],
      "pictures": [
        "image"
      ]
    },
    {
      "table": "event_days",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "day",
        "doors_at",
        "last_entry_at",
        "curfew_at"
      ],
      "filters": [
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ]
    },
    {
      "table": "acts",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "name",
        "room_id",
        "day",
        "position"
      ],
      "filters": [
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ]
    },
    {
      "table": "acts",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "name",
        "room_id",
        "day",
        "starts_at",
        "ends_at",
        "position"
      ],
      "filters": [
        {
          "column": "sets_published",
          "op": "eq",
          "value": true
        },
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ]
    },
    {
      "table": "ticket_types",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "name",
        "kind",
        "description",
        "price",
        "capacity",
        "min_per_order",
        "max_per_order",
        "pay_door",
        "pay_transfer",
        "sales_start",
        "sales_end",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "selling",
        "position"
      ],
      "filters": [
        {
          "column": "visibility",
          "op": "eq",
          "value": "public"
        },
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ]
    },
    {
      "table": "ticket_types",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "name",
        "kind",
        "description",
        "price",
        "capacity",
        "min_per_order",
        "max_per_order",
        "pay_door",
        "pay_transfer",
        "sales_start",
        "sales_end",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "selling",
        "position"
      ],
      "filters": [
        {
          "column": "visibility",
          "op": "eq",
          "value": "code"
        },
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ],
      "unlockBy": {
        "table": "codes",
        "column": "code",
        "link": "unlocks_type_id",
        "where": [
          {
            "column": "active",
            "eq": true
          }
        ]
      }
    },
    {
      "table": "questions",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "event_id",
        "text",
        "kind",
        "options",
        "per",
        "required",
        "position"
      ],
      "filters": [
        {
          "column": "event_status",
          "op": "in",
          "value": [
            "published",
            "cancelled"
          ]
        }
      ]
    },
    {
      "table": "tickets",
      "kind": "availability",
      "methods": [
        "GET"
      ],
      "under": "event_id",
      "showLeft": {
        "belowShare": 15
      }
    },
    {
      "table": "orders",
      "methods": [
        "POST"
      ],
      "level": "verified",
      "humanCheck": true,
      "select": [
        "id",
        "number",
        "status",
        "event_id",
        "language",
        "code_text",
        "code_kind",
        "code_value",
        "code_type_kind",
        "subtotal",
        "discount",
        "adjusted",
        "total",
        "ticket_count",
        "collected",
        "paid_in",
        "refunded",
        "balance",
        "held_until",
        "offer_until",
        "pay_by",
        "created_at",
        "paid_at",
        "paid_method",
        "cancelled_at",
        "opt_in",
        "kept_at"
      ],
      "writable": [
        "event_id",
        "room_id",
        "buyer_name",
        "email",
        "code_text",
        "client_key",
        "opt_in",
        "answers",
        "access_note",
        "language"
      ],
      "requires": [
        "email",
        "buyer_name"
      ],
      "claimedBy": {
        "table": "customers",
        "column": "customer_id",
        "optional": true
      },
      "identity": {
        "table": "customers",
        "email": "email",
        "link": "customer_id",
        "fill": {
          "name": "buyer_name"
        }
      },
      "shareLink": "link_token",
      "agrees": [
        {
          "column": "room_id",
          "eq": {
            "via": "event_id",
            "column": "room_id"
          }
        }
      ],
      "anonymous": {
        "perValue": {
          "columns": [
            "email"
          ],
          "n": 20
        },
        "plainText": [
          "buyer_name"
        ]
      },
      "children": {
        "tickets": {
          "via": "order_id",
          "writable": [
            "ticket_type_id",
            "holder_name",
            "answers"
          ],
          "select": [
            "id",
            "ticket_type_id",
            "name",
            "price",
            "discount",
            "due",
            "holder_name",
            "position"
          ],
          "min": 1,
          "max": 12,
          "agrees": [
            {
              "column": "ticket_type_id",
              "path": [
                "event_id"
              ],
              "eq": {
                "parent": "event_id"
              }
            }
          ],
          "counts": [
            {
              "by": [
                "ticket_type_id"
              ],
              "min": "min_per_order",
              "max": "max_per_order"
            }
          ]
        }
      },
      "dryRun": true,
      "expect": "total",
      "clientKey": "client_key"
    },
    {
      "table": "waitlist",
      "methods": [
        "POST"
      ],
      "level": "verified",
      "humanCheck": true,
      "select": [
        "id",
        "event_id",
        "qty",
        "status"
      ],
      "writable": [
        "event_id",
        "email",
        "qty"
      ],
      "requires": [
        "email"
      ],
      "claimedBy": {
        "table": "customers",
        "column": "customer_id",
        "optional": true
      },
      "identity": {
        "table": "customers",
        "email": "email",
        "link": "customer_id"
      },
      "anonymous": {
        "perValue": {
          "columns": [
            "email"
          ],
          "n": 5
        }
      },
      "requireSetting": [
        {
          "table": "settings",
          "column": "waitlist_on"
        }
      ]
    },
    {
      "table": "reminders",
      "methods": [
        "POST"
      ],
      "level": "verified",
      "humanCheck": true,
      "select": [
        "id",
        "event_id",
        "ticket_type_id",
        "target"
      ],
      "writable": [
        "event_id",
        "ticket_type_id",
        "target",
        "email"
      ],
      "requires": [
        "email"
      ],
      "claimedBy": {
        "table": "customers",
        "column": "customer_id",
        "optional": true
      },
      "identity": {
        "table": "customers",
        "email": "email",
        "link": "customer_id"
      },
      "anonymous": {
        "perValue": {
          "columns": [
            "email"
          ],
          "n": 10
        }
      }
    },
    {
      "table": "orders",
      "key": "link",
      "methods": [
        "GET",
        "PATCH"
      ],
      "claim": {
        "by": "token",
        "column": "link_token",
        "stopped": "link_stopped",
        "own": true,
        "address": "email"
      },
      "select": [
        "id",
        "number",
        "status",
        "event_id",
        "buyer_name",
        "email",
        "language",
        "code_text",
        "code_kind",
        "code_value",
        "code_type_kind",
        "subtotal",
        "discount",
        "adjusted",
        "total",
        "ticket_count",
        "collected",
        "paid_in",
        "refunded",
        "balance",
        "held_until",
        "offer_until",
        "pay_by",
        "created_at",
        "paid_at",
        "paid_method",
        "cancelled_at",
        "opt_in",
        "kept_at"
      ],
      "writable": [
        "status",
        "buyer_name",
        "opt_in",
        "answers",
        "access_note",
        "language",
        "kept_at"
      ],
      "writableValues": {
        "status": [
          "confirming",
          "door",
          "no_charge",
          "let_go"
        ]
      },
      "writableWhen": {
        "status": [
          "held",
          "confirming",
          "offered",
          "door",
          "awaiting_transfer",
          "overdue",
          "no_charge",
          "paid",
          "not_collected"
        ]
      },
      "documents": [
        "receipt"
      ]
    },
    {
      "table": "tickets",
      "key": "link",
      "methods": [
        "GET",
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status",
        "pending_email",
        "pending_name"
      ],
      "writableValues": {
        "status": [
          "offered",
          "valid",
          "refund_asked"
        ]
      },
      "writableWhen": {
        "status": [
          "valid",
          "offered",
          "refund_asked"
        ],
        "holder_customer_id": [
          null
        ],
        "order_status": [
          "door",
          "no_charge",
          "paid"
        ]
      },
      "limits": {
        "perValue": {
          "columns": [
            "pending_email"
          ],
          "n": 5
        },
        "plainText": [
          "pending_name"
        ]
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "key": "link",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "holder_name",
        "answers"
      ],
      "writableWhen": {
        "status": [
          "valid",
          "offered",
          "refund_asked"
        ],
        "holder_customer_id": [
          null
        ],
        "order_status": [
          "held",
          "confirming",
          "offered",
          "door",
          "no_charge",
          "paid",
          "awaiting_transfer",
          "overdue"
        ]
      },
      "limits": {
        "plainText": [
          "holder_name"
        ]
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "key": "link",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status",
        "cancel_cause"
      ],
      "writableValues": {
        "status": [
          "returned"
        ],
        "cancel_cause": [
          "buyer"
        ]
      },
      "writableWhen": {
        "status": [
          "valid"
        ],
        "order_status": [
          "offered",
          "door"
        ],
        "holder_customer_id": [
          null
        ],
        "collected": [
          null,
          0
        ],
        "times_in": [
          null,
          0
        ],
        "waitlist_on": [
          true
        ],
        "event_id": {
          "before": {
            "column": "doors_at"
          }
        }
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "tickets",
      "key": "link",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "orders",
        "via": "order_id"
      },
      "select": [
        "id",
        "order_id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "price",
        "discount",
        "due",
        "collected",
        "position",
        "admits_day1",
        "admits_day2",
        "admits_day3",
        "code",
        "holder_name",
        "pending_name",
        "offer_until",
        "sent_at",
        "accepted_at",
        "refund_asked_at",
        "times_in"
      ],
      "writable": [
        "status"
      ],
      "writableValues": {
        "status": [
          "cancelled"
        ]
      },
      "defaults": {
        "cancel_cause": "buyer"
      },
      "writableWhen": {
        "status": [
          "valid"
        ],
        "order_status": [
          "door"
        ],
        "holder_customer_id": [
          null
        ],
        "collected": [
          null,
          0
        ],
        "times_in": [
          null,
          0
        ],
        "waitlist_on": [
          false
        ],
        "event_id": {
          "before": {
            "column": "doors_at"
          }
        }
      },
      "withhold": {
        "columns": [
          "code"
        ],
        "unlessHolder": "holder_customer_id",
        "when": {
          "where": [
            {
              "column": "order_status",
              "in": [
                "held",
                "confirming",
                "offered",
                "awaiting_transfer",
                "overdue",
                "released"
              ]
            }
          ]
        }
      }
    },
    {
      "table": "settings",
      "key": "link",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "select": [
        "bank_account_name",
        "bank_name",
        "bank_account_number",
        "bank_routing"
      ]
    },
    {
      "table": "orders",
      "key": "confirm",
      "methods": [
        "GET",
        "PATCH"
      ],
      "claim": {
        "by": "token",
        "column": "confirm_token",
        "own": true,
        "address": "email"
      },
      "select": [
        "id",
        "number",
        "status",
        "event_id",
        "total",
        "ticket_count",
        "held_until",
        "offer_until",
        "pay_by"
      ],
      "writable": [
        "status"
      ],
      "writableValues": {
        "status": [
          "awaiting_transfer"
        ]
      },
      "writableWhen": {
        "status": [
          "confirming"
        ]
      }
    },
    {
      "table": "settings",
      "key": "confirm",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "select": [
        "bank_account_name",
        "bank_name",
        "bank_account_number",
        "bank_routing"
      ]
    },
    {
      "table": "tickets",
      "key": "ticket",
      "methods": [
        "GET",
        "PATCH"
      ],
      "claim": {
        "by": "token",
        "column": "link_token",
        "own": true,
        "address": [
          "pending_email",
          "holder_email"
        ]
      },
      "select": [
        "id",
        "ticket_type_id",
        "event_id",
        "status",
        "name",
        "due",
        "collected",
        "code",
        "pending_name",
        "holder_name",
        "sender_name",
        "offer_until",
        "accepted_at"
      ],
      "withhold": {
        "columns": [
          "code"
        ],
        "when": {
          "where": [
            {
              "column": "holder_customer_id",
              "isNull": true
            }
          ]
        }
      },
      "writable": [
        "status",
        "holder_name"
      ],
      "requires": [
        "status",
        "holder_name"
      ],
      "writableValues": {
        "status": [
          "valid"
        ]
      },
      "writableWhen": {
        "status": [
          "offered"
        ]
      },
      "limits": {
        "plainText": [
          "holder_name"
        ]
      },
      "identity": {
        "table": "customers",
        "email": "pending_email",
        "link": "holder_customer_id",
        "fill": {
          "name": "holder_name"
        },
        "on": {
          "to": "valid"
        }
      }
    }
  ],
  "roles": [
    {
      "key": "box-office",
      "grants": {
        "settings": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "rooms": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "events": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "event_days": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "acts": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "ticket_types": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "codes": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "customers": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "questions": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "orders": [
          "read",
          "create",
          "update",
          "read_pii"
        ],
        "tickets": [
          "read",
          "create",
          "update",
          "read_pii"
        ],
        "check_ins": [
          "read",
          "create",
          "update"
        ],
        "door_collections": [
          "read",
          "create",
          "update"
        ],
        "payments": [
          "read",
          "create",
          "update"
        ],
        "refunds": [
          "read",
          "create",
          "update"
        ],
        "guest_list": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "waitlist": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "reminders": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "broadcasts": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "messages": [
          "read",
          "create",
          "update",
          "read_pii"
        ],
        "devices": [
          "read",
          "create",
          "update",
          "delete"
        ]
      },
      "limits": null
    },
    {
      "key": "door",
      "grants": {
        "settings": [
          "read"
        ],
        "rooms": [
          "read"
        ],
        "events": [
          "read"
        ],
        "event_days": [
          "read"
        ],
        "ticket_types": [
          "read"
        ],
        "orders": [
          "read",
          "create",
          "update"
        ],
        "tickets": [
          "read",
          "create"
        ],
        "check_ins": [
          "read",
          "create",
          "delete"
        ],
        "door_collections": [
          "read",
          "create",
          "update"
        ],
        "payments": [
          "read"
        ],
        "guest_list": [
          "read",
          "update"
        ],
        "devices": [
          "read"
        ]
      },
      "limits": {
        "orders": {
          "writable": [
            "status",
            "buyer_name",
            "channel",
            "note",
            "paid_method"
          ],
          "writableValues": {
            "status": [
              "door",
              "paid"
            ],
            "channel": [
              "door"
            ],
            "paid_method": [
              "card",
              "cash"
            ]
          }
        },
        "door_collections": {
          "writable": [
            "state"
          ],
          "writableValues": {
            "state": [
              "voided"
            ]
          }
        },
        "guest_list": {
          "writable": [
            "status",
            "arrived"
          ]
        }
      }
    }
  ],
  "producers": [
    {
      "kind": "tickets",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": [
          "door",
          "no_charge"
        ]
      }
    },
    {
      "kind": "tickets-paid",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "paid",
        "where": {
          "column": "paid_email",
          "eq": 1
        }
      }
    },
    {
      "kind": "transfer-confirm",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "confirming",
        "where": {
          "column": "waitlist_id",
          "isNull": true
        }
      }
    },
    {
      "kind": "transfer-confirm-offer",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "confirming",
        "where": {
          "column": "waitlist_id",
          "isNull": false
        }
      }
    },
    {
      "kind": "transfer-waiting",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "awaiting_transfer"
      }
    },
    {
      "kind": "transfer-released",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "released"
      }
    },
    {
      "kind": "payment-received",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "paid",
        "where": {
          "column": "paid_email",
          "eq": 2
        }
      }
    },
    {
      "kind": "waitlist-offer",
      "link": "order_id",
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": "offered"
      }
    },
    {
      "kind": "cancelled-paid",
      "link": "order_id",
      "hold": true,
      "onChange": {
        "table": "orders",
        "column": "cancel_cause",
        "to": "show",
        "where": {
          "column": "cancel_email",
          "eq": 1
        }
      }
    },
    {
      "kind": "cancelled-unpaid",
      "link": "order_id",
      "hold": true,
      "onChange": {
        "table": "orders",
        "column": "cancel_cause",
        "to": "show",
        "where": {
          "column": "cancel_email",
          "eq": 2
        }
      }
    },
    {
      "kind": "cancelled-holder",
      "link": "ticket_id",
      "recipient": {
        "column": "holder_email",
        "name": "holder_name"
      },
      "hold": true,
      "onChange": {
        "table": "tickets",
        "column": "order_cancel_cause",
        "to": "show",
        "where": {
          "column": "holder_customer_id",
          "isNull": false
        }
      }
    },
    {
      "kind": "tonight",
      "link": "order_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "tonight_email_on"
        }
      },
      "due": {
        "date": "doors_at",
        "days": 0,
        "at": "12:00"
      },
      "dropWhen": [
        {
          "column": "status",
          "in": [
            "cancelled",
            "released",
            "let_go",
            "expired",
            "not_collected"
          ],
          "reason": "no-longer-needed"
        },
        {
          "column": "ticket_count",
          "lte": 0,
          "reason": "no-longer-needed"
        }
      ],
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": [
          "door",
          "no_charge",
          "paid"
        ],
        "where": {
          "column": "eve_email",
          "eq": false
        }
      }
    },
    {
      "kind": "tomorrow",
      "link": "order_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "tonight_email_on"
        }
      },
      "due": {
        "date": "eve_at",
        "days": 0,
        "at": "18:00"
      },
      "dropWhen": [
        {
          "column": "status",
          "in": [
            "cancelled",
            "released",
            "let_go",
            "expired",
            "not_collected"
          ],
          "reason": "no-longer-needed"
        },
        {
          "column": "ticket_count",
          "lte": 0,
          "reason": "no-longer-needed"
        }
      ],
      "onChange": {
        "table": "orders",
        "column": "status",
        "to": [
          "door",
          "no_charge",
          "paid"
        ],
        "where": {
          "column": "eve_email",
          "eq": true
        }
      }
    },
    {
      "kind": "tonight-holder",
      "link": "ticket_id",
      "recipient": {
        "column": "holder_email",
        "name": "holder_name"
      },
      "gate": {
        "setting": {
          "table": "settings",
          "column": "tonight_email_on"
        }
      },
      "due": {
        "date": "doors_at",
        "days": 0,
        "at": "12:00"
      },
      "dropWhen": [
        {
          "column": "status",
          "in": [
            "cancelled",
            "returned",
            "released"
          ],
          "reason": "no-longer-needed"
        },
        {
          "column": "order_status",
          "in": [
            "cancelled",
            "released",
            "let_go",
            "expired",
            "not_collected"
          ],
          "reason": "no-longer-needed"
        }
      ],
      "onChange": {
        "table": "tickets",
        "column": "holder_reminder",
        "to": 1
      }
    },
    {
      "kind": "tomorrow-holder",
      "link": "ticket_id",
      "recipient": {
        "column": "holder_email",
        "name": "holder_name"
      },
      "gate": {
        "setting": {
          "table": "settings",
          "column": "tonight_email_on"
        }
      },
      "due": {
        "date": "eve_at",
        "days": 0,
        "at": "18:00"
      },
      "dropWhen": [
        {
          "column": "status",
          "in": [
            "cancelled",
            "returned",
            "released"
          ],
          "reason": "no-longer-needed"
        },
        {
          "column": "order_status",
          "in": [
            "cancelled",
            "released",
            "let_go",
            "expired",
            "not_collected"
          ],
          "reason": "no-longer-needed"
        }
      ],
      "onChange": {
        "table": "tickets",
        "column": "holder_reminder",
        "to": 2
      }
    },
    {
      "kind": "friend-offer",
      "link": "ticket_id",
      "recipient": {
        "column": "pending_email",
        "name": "pending_name"
      },
      "repeatBy": "link_token",
      "onChange": {
        "table": "tickets",
        "column": "status",
        "to": "offered"
      }
    },
    {
      "kind": "friend-ready",
      "link": "ticket_id",
      "recipient": {
        "column": "holder_email",
        "name": "holder_name"
      },
      "onChange": {
        "table": "tickets",
        "column": "status",
        "to": "valid",
        "where": {
          "column": "holder_customer_id",
          "isNull": false
        }
      }
    },
    {
      "kind": "friend-returned",
      "link": "ticket_id",
      "repeat": true,
      "onChange": {
        "table": "tickets",
        "column": "lapsed",
        "to": true
      }
    },
    {
      "kind": "refund-declined",
      "link": "ticket_id",
      "onChange": {
        "table": "tickets",
        "column": "status",
        "to": "valid",
        "where": {
          "column": "refund_declined_at",
          "isNull": false
        }
      }
    },
    {
      "kind": "tickets-cancelled",
      "link": "order_id",
      "batchMinutes": 2,
      "onChange": {
        "table": "tickets",
        "via": "order_id",
        "column": "cancel_cause",
        "to": [
          "box_office",
          "request",
          "buyer"
        ]
      }
    },
    {
      "kind": "refund-recorded",
      "link": "refund_id",
      "onCreate": {
        "table": "refunds",
        "where": {
          "column": "voided",
          "eq": false
        }
      }
    },
    {
      "kind": "on-sale",
      "link": "reminder_id",
      "before": {
        "table": "reminders",
        "at": "on_sale_at",
        "lead": {
          "via": "event_id",
          "table": "events",
          "column": "remind_lead_hours",
          "fallback": {
            "table": "settings",
            "column": "remind_lead_hours"
          },
          "max": 24
        },
        "where": {
          "column": "target",
          "eq": "sale"
        }
      }
    },
    {
      "kind": "on-sale-presale",
      "link": "reminder_id",
      "before": {
        "table": "reminders",
        "at": "type_sales_start",
        "lead": {
          "via": "event_id",
          "table": "events",
          "column": "remind_lead_hours",
          "fallback": {
            "table": "settings",
            "column": "remind_lead_hours"
          },
          "max": 24
        },
        "where": {
          "column": "ticket_type_id",
          "isNull": false
        }
      }
    }
  ],
  "kinds": {
    "tickets": "events-tickets",
    "tickets-paid": "events-tickets-paid",
    "transfer-confirm": "events-transfer-confirm",
    "transfer-confirm-offer": "events-transfer-confirm-offer",
    "transfer-waiting": "events-transfer-waiting",
    "transfer-reminder": "events-transfer-reminder",
    "transfer-released": "events-transfer-released",
    "payment-received": "events-payment-received",
    "friend-offer": "events-friend-offer",
    "friend-ready": "events-friend-ready",
    "friend-returned": "events-friend-returned",
    "holder-set": "events-holder-set",
    "waitlist-offer": "events-waitlist-offer",
    "on-sale": "events-on-sale",
    "on-sale-presale": "events-on-sale-presale",
    "moved": "events-moved",
    "moved-holder": "events-moved-holder",
    "cancelled-paid": "events-cancelled-paid",
    "cancelled-unpaid": "events-cancelled-unpaid",
    "cancelled-holder": "events-cancelled-holder",
    "tonight": "events-tonight",
    "tomorrow": "events-tomorrow",
    "tonight-holder": "events-tonight-holder",
    "tomorrow-holder": "events-tomorrow-holder",
    "refund-recorded": "events-refund-recorded",
    "tickets-cancelled": "events-tickets-cancelled",
    "refund-declined": "events-refund-declined",
    "broadcast": "events-broadcast",
    "broadcast-holder": "events-broadcast-holder"
  }
} as const;
