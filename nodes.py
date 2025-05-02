import os


class PromptCheckList:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": (
                    "STRING",
                    {"default": "", "multiline": True},
                )
            },
            "optional": {"prefix": ("STRING", {"forceInput": True})},
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "process"
    CATEGORY = "utils"

    def process(self, text, prefix=None):
        lines = text.split("\n")
        filtered_lines = []
        for line in lines:
            # 空行は除外
            if not line.strip():
                continue
            # コメント行は除外
            if line.strip().startswith("//"):
                continue
            # 行内コメントを削除
            if "//" in line:
                line = line.split("//")[0].rstrip()
            # カンマを追加
            if not line.strip().endswith(","):
                line = line + ", "
            filtered_lines.append(line)
        result = "\n".join(filtered_lines)

        if prefix:
            result = prefix + "\n" + result

        return (result,)


NODE_CLASS_MAPPINGS = {"PromptCheckList": PromptCheckList}
NODE_DISPLAY_NAME_MAPPINGS = {"PromptCheckList": "Prompt Check List"}
WEB_DIRECTORY = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")
