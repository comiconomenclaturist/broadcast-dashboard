from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from studio.services import update_studio_state
from studio.models import Studio
import json


@sync_to_async
def get_studio(slug):
    return Studio.objects.get(slug=slug)


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "dashboard"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def state_update(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.channel_layer.group_send(
            "dashboard",
            {
                "type": "state_update",
                "message": {
                    "slug": self.studio.slug,
                    "name": self.studio.name,
                    "power": data.get("power"),
                    "mic": data.get("mic"),
                    "record": data.get("record"),
                    "on_air": data.get("on_air", []),
                },
            },
        )

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))


class StudioConsumer(AsyncWebsocketConsumer):
    ALLOWED_COMMANDS = {"on_air", "record", "power"}

    async def connect(self):
        self.studio_slug = self.scope["url_route"]["kwargs"]["studio_name"]
        self.studio = await get_studio(self.studio_slug)
        self.group_name = f"studio_{self.studio_slug}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.apply_update(data)
        await self.channel_layer.group_send(
            self.group_name, {"type": "device_command", "message": data}
        )
        await self.channel_layer.group_send(
            "dashboard",
            {
                "type": "state_update",
                "message": {
                    "slug": self.studio.slug,
                    "name": self.studio.name,
                    "power": data.get("power"),
                    "mic": data.get("mic"),
                    "record": data.get("record"),
                    "on_air": data.get("on_air", []),
                },
            },
        )

    async def apply_update(self, data):
        await sync_to_async(update_studio_state)(
            self.studio, data, data.get("on_air", [])
        )

    async def device_command(self, event):
        await self.send(text_data=json.dumps(event["message"]))
